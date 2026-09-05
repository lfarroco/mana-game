/**
 * SQLite (better-sqlite3) repositories — Phase 4 durable persistence.
 *
 * Implements the exact same repository interfaces as memory.ts, backed by a
 * better-sqlite3 Database, so the app layer never changes. Schema is modeled
 * on the retired Supabase tables (docs/game-server.md §Persistence), adapted
 * to the current repo interfaces:
 *
 *   players(player_id PK, provider, provider_id, display_name, created_at,
 *           UNIQUE(provider, provider_id))
 *   tokens(token_hash PK, player_id, expires_at, created_at)
 *   sessions(player_id PK, session_json)   — SessionData minus combatState
 *   combat_states(session_id PK, combat_json) — CombatCodec-serialized DTO
 *   ghosts(ghost_id PK, player_id, session_id, round, team_json, rating,
 *          created_at) + index on round
 *   recently_fought(player_id, opponent_player_id, seq AUTOINCREMENT PK,
 *                   UNIQUE(player_id, opponent_player_id)) — capped FIFO log
 *   ratings(player_id PK, rating, updated_at)
 *   run_completions(session_id PK, player_id, tier, wins, completed_at)
 *          + index on (player_id, completed_at) — season-window victory counts
 *
 * Schema decision (documented deviation from the old Supabase tables): the
 * old schema kept player rating + token_hash on the players row, but the
 * current Player/Token/Rating repos split them — so there are separate
 * `tokens` and `ratings` tables, and `players` only holds identity.
 *
 * Combat-state decision: SessionData embeds the live CombatState (a
 * Map-carrying object) while in the combat phase, but plain JSON cannot hold
 * Maps — a naive JSON round-trip would corrupt resume-mid-combat. Instead the
 * combat state is serialized through the core CombatCodec into a JSON-safe
 * DTO and stored separately in `combat_states`, keyed by session id. On load
 * it is deserialized (unitById Map + derived indexes rebuilt) and re-attached,
 * keeping the in-memory resume behavior byte-identical (the wire response
 * after a restart serializes to the exact same DTO as before the restart).
 * A separate table also matches the documented schema.
 *
 * Prepared statements are created once per repo and reused; user data only
 * ever flows through `?` parameters — never string interpolation. Table
 * creation is idempotent (CREATE TABLE IF NOT EXISTS) and `:memory:` is
 * supported for tests.
 */

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { v4 as uuid } from "uuid";
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

/** All six repos sharing one Database connection. */
export type SqliteRepos = {
  db: Database.Database;
  sessionRepo: SessionRepo;
  playerRepo: PlayerRepo;
  tokenRepo: TokenRepo;
  ghostRepo: GhostRepo;
  ratingRepo: RatingRepo;
  playerStatsRepo: PlayerStatsRepo;
  idempotencyRepo: IdempotencyRepo;
};

/**
 * Open (or create) a SQLite database and lay down the schema. Idempotent —
 * safe to call on every boot. `:memory:` returns a fresh throwaway in-memory
 * database (per-connection); file paths get WAL journaling and an
 * auto-created parent directory.
 */
export function openSqliteDatabase(path: string): Database.Database {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  createSchema(db);
  return db;
}

/** Idempotent schema creation (CREATE TABLE IF NOT EXISTS). */
export function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      player_id    TEXT PRIMARY KEY,
      provider     TEXT NOT NULL,
      provider_id  TEXT NOT NULL,
      display_name TEXT,
      created_at   INTEGER NOT NULL,
      UNIQUE(provider, provider_id)
    );

    CREATE TABLE IF NOT EXISTS tokens (
      token_hash TEXT PRIMARY KEY,
      player_id  TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      player_id    TEXT PRIMARY KEY,
      session_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS combat_states (
      session_id  TEXT PRIMARY KEY,
      combat_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ghosts (
      ghost_id   TEXT PRIMARY KEY,
      player_id  TEXT NOT NULL,
      session_id TEXT NOT NULL,
      round      INTEGER NOT NULL,
      team_json  TEXT NOT NULL,
      rating     INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ghosts_round ON ghosts(round);

    CREATE TABLE IF NOT EXISTS recently_fought (
      player_id           TEXT NOT NULL,
      opponent_player_id  TEXT NOT NULL,
      seq                 INTEGER PRIMARY KEY AUTOINCREMENT,
      UNIQUE(player_id, opponent_player_id)
    );

    CREATE TABLE IF NOT EXISTS ratings (
      player_id  TEXT PRIMARY KEY,
      rating     INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS run_completions (
      session_id   TEXT PRIMARY KEY,
      player_id    TEXT NOT NULL,
      tier         TEXT,
      wins         INTEGER NOT NULL,
      completed_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_run_completions_player_time
      ON run_completions(player_id, completed_at);

    CREATE TABLE IF NOT EXISTS idempotency (
      player_id    TEXT NOT NULL,
      action_key   TEXT NOT NULL,
      session_json TEXT NOT NULL,
      combat_json  TEXT,
      created_at   INTEGER NOT NULL,
      PRIMARY KEY (player_id, action_key)
    );
  `);

  // Column migration for databases created before the rename feature
  // (`CREATE TABLE IF NOT EXISTS` never alters an existing players table).
  migrateDisplayNameColumn(db);
}

/**
 * Add the `display_name_updated_at` rename-cooldown column to `players` when
 * missing. Guarded by a `PRAGMA table_info` check — no-op on fresh databases
 * and on already-migrated ones, so it is safe to run on every boot.
 */
function migrateDisplayNameColumn(db: Database.Database): void {
  const columns = db.prepare("PRAGMA table_info(players)").all() as {
    name: string;
  }[];
  if (columns.some((c) => c.name === "display_name_updated_at")) return;
  db.exec("ALTER TABLE players ADD COLUMN display_name_updated_at INTEGER");
}

/** Session repository — session JSON in `sessions`, combat DTO in `combat_states`. */
export function createSqliteSessionRepo(db: Database.Database): SessionRepo {
  const getStmt = db.prepare(
    "SELECT session_json FROM sessions WHERE player_id = ?",
  );
  const upsertStmt = db.prepare(
    `INSERT INTO sessions (player_id, session_json) VALUES (?, ?)
     ON CONFLICT(player_id) DO UPDATE SET session_json = excluded.session_json`,
  );
  const deleteStmt = db.prepare("DELETE FROM sessions WHERE player_id = ?");
  const getCombatStmt = db.prepare(
    "SELECT combat_json FROM combat_states WHERE session_id = ?",
  );
  const upsertCombatStmt = db.prepare(
    `INSERT INTO combat_states (session_id, combat_json) VALUES (?, ?)
     ON CONFLICT(session_id) DO UPDATE SET combat_json = excluded.combat_json`,
  );
  const deleteCombatStmt = db.prepare(
    "DELETE FROM combat_states WHERE session_id = ?",
  );

  // Read one player's session, re-attaching the live combat state while in
  // the combat phase (mirrors the old sync `get`).
  const readSession = (playerId: string): SessionData | null => {
    const row = getStmt.get(playerId) as { session_json: string } | undefined;
    if (!row) return null;

    const session = parseSessionJson(row.session_json);
    if (session.phase === "combat") {
      const combatRow = getCombatStmt.get(session.id) as
        { combat_json: string } | undefined;
      if (combatRow) {
        session.combatState = CombatCodec.deserializeCombatState(
          JSON.parse(combatRow.combat_json) as CombatCodec.CombatStateDto,
        );
      }
    }
    return session;
  };

  // Session + combat state are written atomically: a crash mid-write can never
  // leave a session row without its combat state (or vice versa).
  const writeSession = (playerId: string, session: SessionData): void => {
    const { combatState, ...rest } = session;
    upsertStmt.run(playerId, JSON.stringify(rest));
    if (combatState) {
      upsertCombatStmt.run(
        session.id,
        JSON.stringify(CombatCodec.serializeCombatState(combatState)),
      );
    }
  };

  const upsertTx = db.transaction((playerId: string, session: SessionData) => {
    writeSession(playerId, session);
  });

  const deleteTx = db.transaction((playerId: string) => {
    const row = getStmt.get(playerId) as { session_json: string } | undefined;
    deleteStmt.run(playerId);
    if (row) {
      deleteCombatStmt.run(parseSessionJson(row.session_json).id);
    }
  });

  // Atomic read-modify-write: the updater runs inside a write transaction,
  // so concurrent dispatches serialize instead of interleaving get/upsert.
  // The updater itself is pure (no side effects), matching the interface
  // contract shared with the Firestore backend.
  const updateTx = db.transaction(
    (playerId: string, updater: SessionUpdater): ActionResponse => {
      const result = updater(readSession(playerId));
      writeSession(playerId, result.session);
      return result;
    },
  );

  return {
    get: async (playerId) => readSession(playerId),
    upsert: async (playerId, session) => {
      upsertTx(playerId, session);
    },
    delete: async (playerId) => {
      deleteTx(playerId);
    },
    update: async (playerId, updater) => updateTx(playerId, updater),
  };
}

/**
 * Player repository. `UNIQUE(provider, provider_id)` enforces the same
 * invariant as the in-memory repo: one Steam account maps to exactly one
 * player, and repeat logins return the existing player.
 */
export function createSqlitePlayerRepo(db: Database.Database): PlayerRepo {
  const findByProviderStmt = db.prepare(
    `SELECT player_id, provider, provider_id, display_name,
            display_name_updated_at, created_at
     FROM players WHERE provider = ? AND provider_id = ?`,
  );
  const findByIdStmt = db.prepare(
    `SELECT player_id, provider, provider_id, display_name,
            display_name_updated_at, created_at
     FROM players WHERE player_id = ?`,
  );
  const insertStmt = db.prepare(
    `INSERT INTO players (player_id, provider, provider_id, display_name, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const updateDisplayNameStmt = db.prepare(
    `UPDATE players
     SET display_name = ?, display_name_updated_at = ?
     WHERE player_id = ?`,
  );

  const rowToPlayer = (row: PlayerRow): Player => ({
    playerId: row.player_id,
    provider: row.provider,
    providerId: row.provider_id,
    displayName: row.display_name ?? undefined,
    displayNameUpdatedAt: row.display_name_updated_at ?? undefined,
    createdAt: row.created_at,
  });

  return {
    findByProvider: async (provider, providerId) => {
      const row = findByProviderStmt.get(provider, providerId) as
        PlayerRow | undefined;
      return row ? rowToPlayer(row) : null;
    },
    findById: async (playerId) => {
      const row = findByIdStmt.get(playerId) as PlayerRow | undefined;
      return row ? rowToPlayer(row) : null;
    },
    create: async (player) => {
      const existing = findByProviderStmt.get(
        player.provider,
        player.providerId,
      ) as PlayerRow | undefined;
      if (existing) return rowToPlayer(existing); // repeat login → same player
      insertStmt.run(
        player.playerId,
        player.provider,
        player.providerId,
        player.displayName ?? null,
        player.createdAt,
      );
      return player;
    },
    updateDisplayName: async (playerId, displayName, updatedAt) => {
      const result = updateDisplayNameStmt.run(
        displayName,
        updatedAt,
        playerId,
      );
      if (result.changes === 0) return null; // unknown player id
      return rowToPlayer(findByIdStmt.get(playerId) as PlayerRow);
    },
  };
}

/** Token repository keyed by sha256(token) — a player may hold multiple tokens. */
export function createSqliteTokenRepo(db: Database.Database): TokenRepo {
  const createStmt = db.prepare(
    `INSERT INTO tokens (token_hash, player_id, expires_at, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(token_hash) DO UPDATE SET
       player_id = excluded.player_id,
       expires_at = excluded.expires_at,
       created_at = excluded.created_at`,
  );
  const findByHashStmt = db.prepare(
    "SELECT token_hash, player_id, expires_at, created_at FROM tokens WHERE token_hash = ?",
  );

  const rowToToken = (row: TokenRow): TokenRecord => ({
    tokenHash: row.token_hash,
    playerId: row.player_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  });

  return {
    create: async (token) => {
      createStmt.run(
        token.tokenHash,
        token.playerId,
        token.expiresAt,
        token.createdAt,
      );
    },
    findByHash: async (tokenHash) => {
      const row = findByHashStmt.get(tokenHash) as TokenRow | undefined;
      return row ? rowToToken(row) : null;
    },
  };
}

/**
 * Ghost repository — round-addressable snapshots plus the per-player
 * "recently fought" log. Mirrors the in-memory semantics exactly: ghosts come
 * back in insertion order; the recently-fought list is a capped FIFO (20) of
 * opponent player ids, oldest first, where re-recording an opponent moves
 * them to the most-recent end. The `seq` AUTOINCREMENT column keeps the
 * ordering monotonic across restarts.
 */
export function createSqliteGhostRepo(db: Database.Database): GhostRepo {
  const insertStmt = db.prepare(
    `INSERT INTO ghosts (ghost_id, player_id, session_id, round, team_json, rating, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const findByRoundStmt = db.prepare(
    `SELECT ghost_id, player_id, session_id, round, team_json, rating, created_at
     FROM ghosts WHERE round = ? ORDER BY created_at, ghost_id`,
  );
  const deleteMatchupStmt = db.prepare(
    "DELETE FROM recently_fought WHERE player_id = ? AND opponent_player_id = ?",
  );
  const insertMatchupStmt = db.prepare(
    "INSERT INTO recently_fought (player_id, opponent_player_id) VALUES (?, ?)",
  );
  const trimMatchupsStmt = db.prepare(
    `DELETE FROM recently_fought
     WHERE player_id = ?
       AND seq NOT IN (
         SELECT seq FROM recently_fought
         WHERE player_id = ? ORDER BY seq DESC LIMIT ?
       )`,
  );
  const getRecentStmt = db.prepare(
    "SELECT opponent_player_id FROM recently_fought WHERE player_id = ? ORDER BY seq",
  );

  const recordMatchupTx = db.transaction(
    (playerId: string, opponentPlayerId: string) => {
      deleteMatchupStmt.run(playerId, opponentPlayerId);
      insertMatchupStmt.run(playerId, opponentPlayerId);
      trimMatchupsStmt.run(playerId, playerId, MAX_RECENT_OPPONENTS);
    },
  );

  const rowToGhost = (row: GhostRow): Ghost => ({
    ghostId: row.ghost_id,
    playerId: row.player_id,
    sessionId: row.session_id,
    round: row.round,
    team: JSON.parse(row.team_json) as Ghost["team"],
    rating: row.rating,
    createdAt: row.created_at,
  });

  return {
    create: async (ghost: NewGhost): Promise<Ghost> => {
      const stored: Ghost = { ...ghost, ghostId: uuid() };
      insertStmt.run(
        stored.ghostId,
        stored.playerId,
        stored.sessionId,
        stored.round,
        JSON.stringify(stored.team),
        stored.rating,
        stored.createdAt,
      );
      return stored;
    },
    findByRound: async (round) =>
      (findByRoundStmt.all(round) as GhostRow[]).map(rowToGhost),
    recordMatchup: async (playerId, opponentPlayerId) => {
      recordMatchupTx(playerId, opponentPlayerId);
    },
    getRecentOpponents: async (playerId) =>
      (getRecentStmt.all(playerId) as { opponent_player_id: string }[]).map(
        (row) => row.opponent_player_id,
      ),
  };
}

/** Rating repository keyed by player id — one rating per player. */
export function createSqliteRatingRepo(db: Database.Database): RatingRepo {
  const getStmt = db.prepare(
    "SELECT player_id, rating, updated_at FROM ratings WHERE player_id = ?",
  );
  const upsertStmt = db.prepare(
    `INSERT INTO ratings (player_id, rating, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(player_id) DO UPDATE SET
       rating = excluded.rating,
       updated_at = excluded.updated_at`,
  );
  const listTopStmt = db.prepare(
    `SELECT player_id, rating, updated_at FROM ratings
     ORDER BY rating DESC, player_id ASC LIMIT ? OFFSET ?`,
  );
  const countStmt = db.prepare("SELECT COUNT(*) AS count FROM ratings");
  const countAboveStmt = db.prepare(
    `SELECT COUNT(*) AS count FROM ratings
     WHERE rating > ? OR (rating = ? AND player_id < ?)`,
  );

  const rowToRating = (row: RatingRow) => ({
    playerId: row.player_id,
    rating: row.rating,
    updatedAt: row.updated_at,
  });

  return {
    get: async (playerId) => {
      const row = getStmt.get(playerId) as RatingRow | undefined;
      if (!row) return null;
      return rowToRating(row);
    },
    upsert: async (rating) => {
      upsertStmt.run(rating.playerId, rating.rating, rating.updatedAt);
    },
    listTop: async (limit, offset) =>
      (listTopStmt.all(limit, offset) as RatingRow[]).map(rowToRating),
    count: async () => (countStmt.get() as { count: number }).count,
    countAbove: async (rating, playerId) =>
      (countAboveStmt.get(rating, rating, playerId) as { count: number }).count,
  };
}

/**
 * Run-completions repository. The `session_id` PK makes recording idempotent
 * (re-dispatching a terminal action can never double-count a run — the same
 * guard the in-memory repo uses); the `(player_id, completed_at)` index makes
 * season-window counts a range scan.
 */
export function createSqlitePlayerStatsRepo(
  db: Database.Database,
): PlayerStatsRepo {
  const insertStmt = db.prepare(
    `INSERT INTO run_completions (session_id, player_id, tier, wins, completed_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(session_id) DO NOTHING`,
  );
  const countStmt = db.prepare(
    `SELECT tier, COUNT(*) AS count
     FROM run_completions
     WHERE player_id = ? AND completed_at >= ?
     GROUP BY tier`,
  );

  return {
    recordRunCompletion: async (completion: RunCompletion) => {
      insertStmt.run(
        completion.sessionId,
        completion.playerId,
        completion.tier,
        completion.wins,
        completion.completedAt,
      );
    },
    getVictoryCounts: async (playerId, sinceEpochMs) => {
      const rows = countStmt.all(playerId, sinceEpochMs) as {
        tier: string | null;
        count: number;
      }[];
      const counts: VictoryCounts = { bronze: 0, silver: 0, gold: 0 };
      for (const row of rows) {
        if (
          row.tier === "bronze" ||
          row.tier === "silver" ||
          row.tier === "gold"
        ) {
          counts[row.tier] = row.count;
        }
      }
      return counts;
    },
  };
}

/** Convenience factory: all six repos over one Database. */
export function createSqliteRepos(db: Database.Database): SqliteRepos {
  createSchema(db); // idempotent — safe when the caller passed a raw Database
  return {
    db,
    sessionRepo: createSqliteSessionRepo(db),
    playerRepo: createSqlitePlayerRepo(db),
    tokenRepo: createSqliteTokenRepo(db),
    ghostRepo: createSqliteGhostRepo(db),
    ratingRepo: createSqliteRatingRepo(db),
    playerStatsRepo: createSqlitePlayerStatsRepo(db),
    idempotencyRepo: createSqliteIdempotencyRepo(db),
  };
}

/**
 * Action-idempotency store. `save` is write-once per (player_id, action_key)
 * (`ON CONFLICT DO NOTHING`) — the first completed attempt wins, so a
 * retried action replays the stored response instead of running twice.
 */
export function createSqliteIdempotencyRepo(
  db: Database.Database,
): IdempotencyRepo {
  const findStmt = db.prepare(
    `SELECT player_id, action_key, session_json, combat_json, created_at
     FROM idempotency WHERE player_id = ? AND action_key = ?`,
  );
  const insertStmt = db.prepare(
    `INSERT INTO idempotency (player_id, action_key, session_json, combat_json, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(player_id, action_key) DO NOTHING`,
  );

  type IdempotencyRow = {
    player_id: string;
    action_key: string;
    session_json: string;
    combat_json: string | null;
    created_at: number;
  };

  return {
    find: async (playerId, key) => {
      const row = findStmt.get(playerId, key) as IdempotencyRow | undefined;
      if (!row) return null;
      const record: IdempotencyRecord = {
        playerId: row.player_id,
        key: row.action_key,
        sessionJson: row.session_json,
        combatJson: row.combat_json,
        createdAt: row.created_at,
      };
      return record;
    },
    save: async (record) => {
      insertStmt.run(
        record.playerId,
        record.key,
        record.sessionJson,
        record.combatJson,
        record.createdAt,
      );
    },
  };
}

/** JSON.parse with Date normalization (`updated_at` stringifies to ISO). */
function parseSessionJson(json: string): SessionData {
  const session = JSON.parse(json) as SessionData;
  if (typeof session.updated_at === "string") {
    session.updated_at = new Date(session.updated_at);
  }
  return session;
}

type PlayerRow = {
  player_id: string;
  provider: PlayerProvider;
  provider_id: string;
  display_name: string | null;
  display_name_updated_at: number | null;
  created_at: number;
};

type TokenRow = {
  token_hash: string;
  player_id: string;
  expires_at: number;
  created_at: number;
};

type GhostRow = {
  ghost_id: string;
  player_id: string;
  session_id: string;
  round: number;
  team_json: string;
  rating: number;
  created_at: number;
};

type RatingRow = {
  player_id: string;
  rating: number;
  updated_at: number;
};
