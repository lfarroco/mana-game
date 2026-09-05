/**
 * Firestore repositories — production persistence for the Firebase backend.
 *
 * Implements the same async repository interfaces as memory.ts / sqlite.ts.
 * The Admin SDK is loaded lazily inside `getFirestoreDb` (never at module
 * scope), so unit tests can inject a fake database without loading
 * firebase-admin, and `createApp` stays light for the VM path.
 *
 * Layout (all values JSON strings — Firestore rejects `undefined` fields,
 * and units/sessions carry optional fields, so plain strings dodge that):
 *
 *   sessions/{playerId}        { sessionJson, updatedAt } — combat stripped
 *   combatStates/{playerId}    { combatJson } — CombatCodec DTO, combat phase only
 *   players/{playerId}         { provider, providerId, displayName|null,
 *                                displayNameUpdatedAt|null, createdAt }
 *   playerLookup/{sha256}      { playerId } — UNIQUE(provider, providerId)
 *   tokens/{tokenHash}         { playerId, expiresAt, createdAt }
 *   ghosts/{autoId}            { playerId, sessionId, round, teamJson,
 *                                rating, createdAt }
 *   recentlyFought/{playerId}  { opponents: string[] } — capped FIFO (20)
 *   ratings/{playerId}         { rating, updatedAt }
 *   runCompletions/{sessionId} { playerId, tier, wins, completedAt }
 *   idempotency/{playerId_sha} { playerId, key, sessionJson,
 *                                combatJson|null, createdAt } — write-once
 *
 * Deliberately index-free: round lookups and victory counts filter on one
 * field and sort/group client-side (round sets are small), so no composite
 * indexes need deploying.
 *
 * Auth: Application Default Credentials in production (the function's service
 * account), `FIRESTORE_EMULATOR_HOST` for the local emulator — both handled
 * by the Admin SDK, no code branches here.
 */

import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { v4 as uuid } from "uuid";
import type {
  DocumentReference,
  DocumentSnapshot,
  Firestore,
} from "firebase-admin/firestore";
import * as CombatCodec from "@game/Combat/CombatCodec";
import type { SessionData } from "@game/types/session";
import type { ActionResponse } from "@game/types/action";
import type {
  Ghost,
  GhostRepo,
  IdempotencyRecord,
  IdempotencyRepo,
  NewGhost,
  Player,
  PlayerProvider,
  PlayerRepo,
  PlayerStatsRepo,
  Rating,
  RatingRepo,
  RunCompletion,
  SessionRepo,
  SessionUpdater,
  TokenRecord,
  TokenRepo,
  VictoryCounts,
} from "./repositories";

/** Cap on remembered opponents per player (oldest entries fall off first). */
const MAX_RECENT_OPPONENTS = 20;

/** All seven repos over one Firestore database. */
export type FirestoreRepos = {
  db: Firestore;
  sessionRepo: SessionRepo;
  playerRepo: PlayerRepo;
  tokenRepo: TokenRepo;
  ghostRepo: GhostRepo;
  ratingRepo: RatingRepo;
  playerStatsRepo: PlayerStatsRepo;
  idempotencyRepo: IdempotencyRepo;
};

type AdminAppModule = {
  initializeApp: (options?: Record<string, unknown>) => unknown;
};

type AdminFirestoreModule = {
  getFirestore: (app?: unknown) => Firestore;
};

let cachedDb: Firestore | null = null;

/**
 * Open the Firestore database (lazy Admin SDK load). `projectId` selects the
 * project explicitly (`MANA_FIRESTORE_PROJECT_ID`); omit it to use the SDK
 * defaults (GOOGLE_CLOUD_PROJECT / service-account project). Safe to call on
 * every boot — the database is cached per process.
 */
export function getFirestoreDb(projectId?: string): Firestore {
  if (!cachedDb) {
    // firebase-admin v14 is modular: app lifecycle lives in
    // `firebase-admin/app`, Firestore access in `firebase-admin/firestore`
    // (the old `admin.firestore(app)` root export is gone).
    //
    // `createRequire` needs a base path: `__filename` in the bundled CJS
    // build (`import.meta.url` does not survive esbuild's CJS transform),
    // `import.meta.url` when running from TS source (dev/emulator/jest).
    const base =
      typeof __filename !== "undefined" ? __filename : import.meta.url;
    const require = createRequire(base);
    const { initializeApp } = require("firebase-admin/app") as AdminAppModule;
    const { getFirestore } =
      require("firebase-admin/firestore") as AdminFirestoreModule;
    const app = projectId ? initializeApp({ projectId }) : initializeApp();
    cachedDb = getFirestore(app);
  }
  return cachedDb;
}

/** Test seam — drop the cached database so the next call re-initializes. */
export function resetFirestoreForTests(): void {
  cachedDb = null;
}

/** Convenience factory: all seven repos over one database. */
export function createFirestoreRepos(db: Firestore): FirestoreRepos {
  return {
    db,
    sessionRepo: createFirestoreSessionRepo(db),
    playerRepo: createFirestorePlayerRepo(db),
    tokenRepo: createFirestoreTokenRepo(db),
    ghostRepo: createFirestoreGhostRepo(db),
    ratingRepo: createFirestoreRatingRepo(db),
    playerStatsRepo: createFirestorePlayerStatsRepo(db),
    idempotencyRepo: createFirestoreIdempotencyRepo(db),
  };
}

/** sha256 hex — lookup doc ids for (provider, providerId) pairs. */
function lookupHash(provider: PlayerProvider, providerId: string): string {
  return createHash("sha256").update(`${provider}:${providerId}`).digest("hex");
}

/** Idempotency doc id — the client key may contain `/`, so hash it. */
function idempotencyDocId(playerId: string, key: string): string {
  return `${playerId}_${createHash("sha256").update(key).digest("hex")}`;
}

/** JSON.parse with Date normalization (`updated_at` stringifies to ISO). */
function parseStoredSession(json: string): SessionData {
  const session = JSON.parse(json) as SessionData;
  if (typeof session.updated_at === "string") {
    session.updated_at = new Date(session.updated_at);
  }
  return session;
}

/** Session repository — session JSON in `sessions`, combat DTO in `combatStates`. */
export function createFirestoreSessionRepo(db: Firestore): SessionRepo {
  const sessions = db.collection("sessions");
  const combatStates = db.collection("combatStates");

  const stripCombat = (session: SessionData): string => {
    const { combatState: _stripped, ...rest } = session;
    return JSON.stringify(rest);
  };

  // `get` reads through a transaction when one is in flight, directly
  // otherwise — same documents either way.
  const readCurrent = async (
    get: (ref: DocumentReference) => Promise<DocumentSnapshot>,
    playerId: string,
  ): Promise<SessionData | null> => {
    const sessionSnap = await get(sessions.doc(playerId));
    if (!sessionSnap.exists) return null;
    const { sessionJson } = sessionSnap.data() as { sessionJson: string };
    const session = parseStoredSession(sessionJson);
    if (session.phase === "combat") {
      const combatSnap = await get(combatStates.doc(playerId));
      if (combatSnap.exists) {
        const { combatJson } = combatSnap.data() as { combatJson: string };
        session.combatState = CombatCodec.deserializeCombatState(
          JSON.parse(combatJson) as CombatCodec.CombatStateDto,
        );
      }
    }
    return session;
  };

  return {
    get: async (playerId) => readCurrent((ref) => ref.get(), playerId),

    upsert: async (playerId, session) => {
      const batch = db.batch();
      batch.set(sessions.doc(playerId), {
        sessionJson: stripCombat(session),
        updatedAt: Date.now(),
      });
      if (session.combatState) {
        batch.set(combatStates.doc(playerId), {
          combatJson: JSON.stringify(
            CombatCodec.serializeCombatState(session.combatState),
          ),
        });
      }
      await batch.commit();
    },

    delete: async (playerId) => {
      const batch = db.batch();
      batch.delete(sessions.doc(playerId));
      batch.delete(combatStates.doc(playerId));
      await batch.commit();
    },

    // Atomic read-modify-write in a transaction: concurrent dispatches from
    // one player serialize across function instances. The updater is pure
    // (no side effects) so transaction retries are safe.
    update: async (playerId, updater: SessionUpdater) =>
      db.runTransaction(async (tx) => {
        const result: ActionResponse = updater(
          await readCurrent((ref) => tx.get(ref), playerId),
        );
        tx.set(sessions.doc(playerId), {
          sessionJson: stripCombat(result.session),
          updatedAt: Date.now(),
        });
        if (result.session.combatState) {
          tx.set(combatStates.doc(playerId), {
            combatJson: JSON.stringify(
              CombatCodec.serializeCombatState(result.session.combatState),
            ),
          });
        }
        return result;
      }),
  };
}

/**
 * Player repository. The `playerLookup` doc enforces UNIQUE(provider,
 * providerId): `create` runs in a transaction, so two concurrent first
 * logins resolve to the same player instead of forking duplicates.
 */
export function createFirestorePlayerRepo(db: Firestore): PlayerRepo {
  const players = db.collection("players");
  const lookups = db.collection("playerLookup");

  const toPlayer = (playerId: string, data: PlayerDoc): Player => ({
    playerId,
    provider: data.provider,
    providerId: data.providerId,
    displayName: data.displayName ?? undefined,
    displayNameUpdatedAt: data.displayNameUpdatedAt ?? undefined,
    createdAt: data.createdAt,
  });

  return {
    findByProvider: async (provider, providerId) => {
      const lookupSnap = await lookups
        .doc(lookupHash(provider, providerId))
        .get();
      if (!lookupSnap.exists) return null;
      const { playerId } = lookupSnap.data() as { playerId: string };
      const playerSnap = await players.doc(playerId).get();
      if (!playerSnap.exists) return null;
      return toPlayer(playerId, playerSnap.data() as PlayerDoc);
    },

    findById: async (playerId) => {
      const snap = await players.doc(playerId).get();
      if (!snap.exists) return null;
      return toPlayer(playerId, snap.data() as PlayerDoc);
    },

    create: async (player) =>
      db.runTransaction(async (tx) => {
        const lookupRef = lookups.doc(
          lookupHash(player.provider, player.providerId),
        );
        const lookupSnap = await tx.get(lookupRef);
        if (lookupSnap.exists) {
          // Repeat login (or a lost race on first login) → same player.
          const { playerId } = lookupSnap.data() as { playerId: string };
          const playerSnap = await tx.get(players.doc(playerId));
          if (playerSnap.exists) {
            return toPlayer(playerId, playerSnap.data() as PlayerDoc);
          }
        }
        tx.set(players.doc(player.playerId), {
          provider: player.provider,
          providerId: player.providerId,
          displayName: player.displayName ?? null,
          displayNameUpdatedAt: player.displayNameUpdatedAt ?? null,
          createdAt: player.createdAt,
        });
        tx.set(lookupRef, { playerId: player.playerId });
        return player;
      }),

    updateDisplayName: async (playerId, displayName, updatedAt) =>
      db.runTransaction(async (tx) => {
        const ref = players.doc(playerId);
        const snap = await tx.get(ref);
        if (!snap.exists) return null; // unknown player id
        tx.update(ref, { displayName, displayNameUpdatedAt: updatedAt });
        const data = snap.data() as PlayerDoc;
        return toPlayer(playerId, {
          ...data,
          displayName,
          displayNameUpdatedAt: updatedAt,
        });
      }),
  };
}

type PlayerDoc = {
  provider: Player["provider"];
  providerId: string;
  displayName: string | null;
  displayNameUpdatedAt: number | null;
  createdAt: number;
};

/** Token repository keyed by sha256(token) — the doc id itself. */
export function createFirestoreTokenRepo(db: Firestore): TokenRepo {
  const tokens = db.collection("tokens");

  return {
    create: async (token) => {
      await tokens.doc(token.tokenHash).set({
        playerId: token.playerId,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
      });
    },
    findByHash: async (tokenHash) => {
      const snap = await tokens.doc(tokenHash).get();
      if (!snap.exists) return null;
      const data = snap.data() as {
        playerId: string;
        expiresAt: number;
        createdAt: number;
      };
      const record: TokenRecord = {
        tokenHash,
        playerId: data.playerId,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt,
      };
      return record;
    },
  };
}

/**
 * Ghost repository — round-addressable snapshots plus the per-player
 * "recently fought" log. Round sets are small, so `findByRound` filters on
 * one field and sorts client-side (insertion order, then ghost id) — no
 * composite indexes to deploy.
 */
export function createFirestoreGhostRepo(db: Firestore): GhostRepo {
  const ghosts = db.collection("ghosts");
  const recentlyFought = db.collection("recentlyFought");

  const toGhost = (ghostId: string, data: GhostDoc): Ghost => ({
    ghostId,
    playerId: data.playerId,
    sessionId: data.sessionId,
    round: data.round,
    team: JSON.parse(data.teamJson) as Ghost["team"],
    rating: data.rating,
    createdAt: data.createdAt,
  });

  return {
    create: async (ghost: NewGhost): Promise<Ghost> => {
      const stored: Ghost = { ...ghost, ghostId: uuid() };
      await ghosts.doc(stored.ghostId).set({
        playerId: stored.playerId,
        sessionId: stored.sessionId,
        round: stored.round,
        teamJson: JSON.stringify(stored.team),
        rating: stored.rating,
        createdAt: stored.createdAt,
      });
      return stored;
    },

    findByRound: async (round) => {
      const snap = await ghosts.where("round", "==", round).get();
      return snap.docs
        .map((doc) => toGhost(doc.id, doc.data() as GhostDoc))
        .sort(
          (a, b) =>
            a.createdAt - b.createdAt || (a.ghostId < b.ghostId ? -1 : 1),
        );
    },

    recordMatchup: async (playerId, opponentPlayerId) => {
      const ref = recentlyFought.doc(playerId);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const current =
          (snap.exists &&
            ((snap.data() as { opponents?: unknown }).opponents as string[])) ||
          [];
        const next = [
          ...current.filter((id) => id !== opponentPlayerId),
          opponentPlayerId,
        ].slice(-MAX_RECENT_OPPONENTS);
        tx.set(ref, { opponents: next });
      });
    },

    getRecentOpponents: async (playerId) => {
      const snap = await recentlyFought.doc(playerId).get();
      if (!snap.exists) return [];
      return (
        ((snap.data() as { opponents?: unknown }).opponents as string[]) ?? []
      );
    },
  };
}

type GhostDoc = {
  playerId: string;
  sessionId: string;
  round: number;
  teamJson: string;
  rating: number;
  createdAt: number;
};

/** Rating repository keyed by player id — one rating per player. */
export function createFirestoreRatingRepo(db: Firestore): RatingRepo {
  const ratings = db.collection("ratings");

  return {
    get: async (playerId) => {
      const snap = await ratings.doc(playerId).get();
      if (!snap.exists) return null;
      const data = snap.data() as { rating: number; updatedAt: number };
      const rating: Rating = {
        playerId,
        rating: data.rating,
        updatedAt: data.updatedAt,
      };
      return rating;
    },
    upsert: async (rating) => {
      await ratings.doc(rating.playerId).set({
        rating: rating.rating,
        updatedAt: rating.updatedAt,
      });
    },
  };
}

/**
 * Run-completions repository. The doc id is the session id, written in a
 * transaction that keeps the first record — re-recording can never
 * double-count a run. Victory counts filter on the player and aggregate
 * client-side (Firestore has no GROUP BY; run sets per player are small).
 */
export function createFirestorePlayerStatsRepo(db: Firestore): PlayerStatsRepo {
  const completions = db.collection("runCompletions");

  return {
    recordRunCompletion: async (completion: RunCompletion) => {
      const ref = completions.doc(completion.sessionId);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists) return; // already recorded — first write wins
        tx.set(ref, {
          playerId: completion.playerId,
          tier: completion.tier,
          wins: completion.wins,
          completedAt: completion.completedAt,
        });
      });
    },

    getVictoryCounts: async (playerId, sinceEpochMs) => {
      // Single-field equality only (automatic index): the season window
      // filters client-side. Adding `completedAt >=` here would need a
      // composite index — one player's run set is small, so this is cheap.
      const snap = await completions.where("playerId", "==", playerId).get();
      const counts: VictoryCounts = { bronze: 0, silver: 0, gold: 0 };
      for (const doc of snap.docs) {
        const data = doc.data() as {
          tier: string | null;
          completedAt: number;
        };
        if (data.completedAt < sinceEpochMs) continue;
        if (
          data.tier === "bronze" ||
          data.tier === "silver" ||
          data.tier === "gold"
        ) {
          counts[data.tier] += 1;
        }
      }
      return counts;
    },
  };
}

/**
 * Action-idempotency store. The doc id hashes the client key (keys may
 * contain `/`, which doc ids forbid as path separators). `save` is
 * write-once per key: `create()` fails when the doc exists, and that
 * failure means "another attempt already stored the response" — safe to
 * ignore.
 */
export function createFirestoreIdempotencyRepo(db: Firestore): IdempotencyRepo {
  const records = db.collection("idempotency");

  return {
    find: async (playerId, key) => {
      const snap = await records.doc(idempotencyDocId(playerId, key)).get();
      if (!snap.exists) return null;
      const data = snap.data() as {
        key: string;
        sessionJson: string;
        combatJson: string | null;
        createdAt: number;
      };
      const record: IdempotencyRecord = {
        playerId,
        key: data.key,
        sessionJson: data.sessionJson,
        combatJson: data.combatJson,
        createdAt: data.createdAt,
      };
      return record;
    },

    save: async (record) => {
      try {
        await records
          .doc(idempotencyDocId(record.playerId, record.key))
          .create({
            playerId: record.playerId,
            key: record.key,
            sessionJson: record.sessionJson,
            combatJson: record.combatJson,
            createdAt: record.createdAt,
          });
      } catch (err) {
        // ALREADY_EXISTS (gRPC code 6): the first attempt already stored its
        // response — a concurrent duplicate. Anything else is a real failure.
        if ((err as { code?: number }).code !== 6) throw err;
      }
    },
  };
}
