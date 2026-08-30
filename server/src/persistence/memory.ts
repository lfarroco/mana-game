/**
 * In-memory repositories.
 *
 * Stores state in Maps. Create a fresh repo per app instance via the
 * createMemory*Repo() factories — tests get fully isolated state and
 * `createApp()` gets a clean default.
 */

import type { SessionData } from "@game/types/session";
import { v4 as uuid } from "uuid";
import type {
  Ghost,
  GhostRepo,
  NewGhost,
  Player,
  PlayerProvider,
  PlayerRepo,
  PlayerStatsRepo,
  Rating,
  RatingRepo,
  RunCompletion,
  SessionRepo,
  TokenRecord,
  TokenRepo,
  VictoryCounts,
} from "./repositories";

export function createMemorySessionRepo(): SessionRepo {
  const sessions = new Map<string, SessionData>();

  return {
    get: (playerId) => sessions.get(playerId) ?? null,
    upsert: (playerId, session) => {
      sessions.set(playerId, session);
    },
    delete: (playerId) => {
      sessions.delete(playerId);
    },
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
    findByProvider: (provider, providerId) =>
      playersByProvider.get(providerKey(provider, providerId)) ?? null,
    findById: (playerId) => playersById.get(playerId) ?? null,
    create: (player) => {
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
    updateDisplayName: (playerId, displayName, updatedAt) => {
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
    create: (token) => {
      tokens.set(token.tokenHash, token);
    },
    findByHash: (tokenHash) => tokens.get(tokenHash) ?? null,
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
    create: (ghost: NewGhost): Ghost => {
      const stored: Ghost = { ...ghost, ghostId: uuid() };
      ghosts.push(stored);
      return stored;
    },
    findByRound: (round) => ghosts.filter((ghost) => ghost.round === round),
    recordMatchup: (playerId, opponentPlayerId) => {
      const current = recentlyFought.get(playerId) ?? [];
      // Move to the front (most recent) and cap the list.
      const next = [
        ...current.filter((id) => id !== opponentPlayerId),
        opponentPlayerId,
      ];
      recentlyFought.set(playerId, next.slice(-MAX_RECENT_OPPONENTS));
    },
    getRecentOpponents: (playerId) => recentlyFought.get(playerId) ?? [],
  };
}

/**
 * In-memory rating repository keyed by player id. Ratings are initialized to
 * the default (1000) on first session creation and updated on run completion.
 */
export function createMemoryRatingRepo(): RatingRepo {
  const ratings = new Map<string, Rating>();

  return {
    get: (playerId) => ratings.get(playerId) ?? null,
    upsert: (rating) => {
      ratings.set(rating.playerId, rating);
    },
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
    recordRunCompletion: (completion) => {
      if (!completions.has(completion.sessionId)) {
        completions.set(completion.sessionId, completion);
      }
    },
    getVictoryCounts: (playerId, sinceEpochMs) => {
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
