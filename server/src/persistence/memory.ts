/**
 * In-memory repositories.
 *
 * Stores state in Maps. Create a fresh repo per app instance via the
 * createMemory*Repo() factories — tests get fully isolated state and
 * `createApp()` gets a clean default. Methods are async to match the
 * repository interfaces (Firestore has no sync API); the work itself is
 * still synchronous.
 */

import type { SessionData } from "@game/types/session";
import { v4 as uuid } from "uuid";
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
import type { ActionResponse } from "@game/types/action";

export function createMemorySessionRepo(): SessionRepo {
  const sessions = new Map<string, SessionData>();

  const applyUpdate = (
    playerId: string,
    updater: SessionUpdater,
  ): ActionResponse => {
    const result = updater(sessions.get(playerId) ?? null);
    sessions.set(playerId, result.session);
    return result;
  };

  return {
    get: async (playerId) => sessions.get(playerId) ?? null,
    upsert: async (playerId, session) => {
      sessions.set(playerId, session);
    },
    delete: async (playerId) => {
      sessions.delete(playerId);
    },
    // Single process: no contention, so apply directly.
    update: async (playerId, updater) => applyUpdate(playerId, updater),
  };
}

/**
 * In-memory player repository.
 *
 * Two indexes: by `playerId` (lookup by id) and by composite
 * `provider:provider_id` key (enforces UNIQUE(provider, provider_id) — a
 * Steam account maps to exactly one player). `create` returns the existing
 * player when the pair is already known, so repeat logins are idempotent.
 */
export function createMemoryPlayerRepo(): PlayerRepo {
  const playersById = new Map<string, Player>();
  const playersByProvider = new Map<string, Player>();

  const providerKey = (provider: PlayerProvider, providerId: string): string =>
    `${provider}:${providerId}`;

  return {
    findByProvider: async (provider, providerId) =>
      playersByProvider.get(providerKey(provider, providerId)) ?? null,
    findById: async (playerId) => playersById.get(playerId) ?? null,
    create: async (player) => {
      const existing = playersByProvider.get(
        providerKey(player.provider, player.providerId),
      );
      if (existing) return existing; // upsert: repeat login returns same player
      playersByProvider.set(
        providerKey(player.provider, player.providerId),
        player,
      );
      playersById.set(player.playerId, player);
      return player;
    },
    updateDisplayName: async (playerId, displayName, updatedAt) => {
      const player = playersById.get(playerId);
      if (!player) return null;
      const updated: Player = {
        ...player,
        displayName,
        displayNameUpdatedAt: updatedAt,
      };
      playersById.set(playerId, updated);
      playersByProvider.set(
        providerKey(updated.provider, updated.providerId),
        updated,
      );
      return updated;
    },
  };
}

/**
 * In-memory token repository keyed by sha256(token). A player may hold
 * multiple valid tokens (one per device/launch); expiry is enforced by the
 * auth middleware, not here.
 */
export function createMemoryTokenRepo(): TokenRepo {
  const tokens = new Map<string, TokenRecord>();

  return {
    create: async (token) => {
      tokens.set(token.tokenHash, token);
    },
    findByHash: async (tokenHash) => tokens.get(tokenHash) ?? null,
  };
}

/** Cap on remembered opponents per player (oldest entries fall off first). */
const MAX_RECENT_OPPONENTS = 20;

/**
 * In-memory ghost repository. Ghosts are stored in insertion order (oldest
 * first); `findByRound` scans linearly — fine for a single-node alpha. The
 * per-player "recently fought" log is a capped FIFO of opponent player ids.
 */
export function createMemoryGhostRepo(): GhostRepo {
  const ghosts: Ghost[] = [];
  const recentlyFought = new Map<string, string[]>();

  return {
    create: async (ghost: NewGhost): Promise<Ghost> => {
      const stored: Ghost = { ...ghost, ghostId: uuid() };
      ghosts.push(stored);
      return stored;
    },
    findByRound: async (round) =>
      ghosts.filter((ghost) => ghost.round === round),
    recordMatchup: async (playerId, opponentPlayerId) => {
      const current = recentlyFought.get(playerId) ?? [];
      // Move to the front (most recent) and cap the list.
      const next = [
        ...current.filter((id) => id !== opponentPlayerId),
        opponentPlayerId,
      ];
      recentlyFought.set(playerId, next.slice(-MAX_RECENT_OPPONENTS));
    },
    getRecentOpponents: async (playerId) => recentlyFought.get(playerId) ?? [],
  };
}

/**
 * In-memory rating repository keyed by player id. Ratings are initialized to
 * the default (1000) on first session creation and updated on run completion.
 */
export function createMemoryRatingRepo(): RatingRepo {
  const ratings = new Map<string, Rating>();

  /** Leaderboard order: rating DESC, playerId ASC tiebreak. */
  const sorted = (): Rating[] =>
    [...ratings.values()].sort(
      (a, b) => b.rating - a.rating || (a.playerId < b.playerId ? -1 : 1),
    );

  return {
    get: async (playerId) => ratings.get(playerId) ?? null,
    upsert: async (rating) => {
      ratings.set(rating.playerId, rating);
    },
    listTop: async (limit, offset) => sorted().slice(offset, offset + limit),
    count: async () => ratings.size,
    countAbove: async (rating, playerId) =>
      sorted().filter(
        (r) =>
          r.rating > rating || (r.rating === rating && r.playerId < playerId),
      ).length,
  };
}

/**
 * In-memory run-completions repository. Completions are keyed by session id
 * (exactly one per run — re-recording is idempotent, mirroring the SQLite
 * `session_id` PK). Victory counts scan the per-player records.
 */
export function createMemoryPlayerStatsRepo(): PlayerStatsRepo {
  const completions = new Map<string, RunCompletion>();

  return {
    recordRunCompletion: async (completion) => {
      if (!completions.has(completion.sessionId)) {
        completions.set(completion.sessionId, completion);
      }
    },
    getVictoryCounts: async (playerId, sinceEpochMs) => {
      const counts: VictoryCounts = { bronze: 0, silver: 0, gold: 0 };
      for (const completion of completions.values()) {
        if (
          completion.playerId === playerId &&
          completion.completedAt >= sinceEpochMs &&
          completion.tier !== null
        ) {
          counts[completion.tier] += 1;
        }
      }
      return counts;
    },
  };
}

/**
 * In-memory idempotency store keyed by (playerId, key). Write-once per key:
 * the first completed attempt wins, so a retried action replays the stored
 * response instead of running the transition twice.
 */
export function createMemoryIdempotencyRepo(): IdempotencyRepo {
  const records = new Map<string, IdempotencyRecord>();

  const recordKey = (playerId: string, key: string): string =>
    `${playerId}:${key}`;

  return {
    find: async (playerId, key) =>
      records.get(recordKey(playerId, key)) ?? null,
    save: async (record) => {
      const k = recordKey(record.playerId, record.key);
      if (!records.has(k)) {
        records.set(k, record);
      }
    },
  };
}
