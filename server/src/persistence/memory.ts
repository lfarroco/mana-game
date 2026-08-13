/**
 * In-memory repositories.
 *
 * Stores state in Maps. Create a fresh repo per app instance via the
 * createMemory*Repo() factories — tests get fully isolated state and
 * `createApp()` gets a clean default.
 */

import type { SessionData } from "@game/types/session";
import type {
  Player,
  PlayerProvider,
  PlayerRepo,
  SessionRepo,
  TokenRecord,
  TokenRepo,
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
