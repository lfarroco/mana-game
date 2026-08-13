/**
 * Repository interfaces for server persistence.
 *
 * v1 uses in-memory implementations (memory.ts). Phase 4 adds durable SQLite
 * implementations behind the same interfaces so the app layer never changes.
 */

import type { SessionData } from "@game/types/session";

/** Session repository keyed by player id — one active session per player. */
export type SessionRepo = {
  get(playerId: string): SessionData | null;
  upsert(playerId: string, session: SessionData): void;
  delete(playerId: string): void;
};

/**
 * Identity provider for a player account. Steam is the only enabled provider
 * this phase (Steam-only launch, see docs/auth.md); `guest` is a future phase.
 */
export type PlayerProvider = "steam" | "guest";

/**
 * A game server account — the system of record for players. Steam (or a future
 * provider) proves identity; the server owns the player and its sessions.
 */
export type Player = {
  /** Server-generated uuid — replaces the dev-only `X-Player-Id` header. */
  playerId: string;
  provider: PlayerProvider;
  /** steamid64 for steam. Guests (future phase) will need this nullable. */
  providerId: string;
  /** Steam persona name; unverified client-supplied (docs/auth.md). */
  displayName?: string;
  /** Epoch milliseconds. */
  createdAt: number;
};

/**
 * Player repository. `UNIQUE(provider, provider_id)` is an invariant: one
 * Steam account maps to exactly one player, and repeat logins must return the
 * same player (upsert semantics — `create` returns the existing player when
 * the (provider, providerId) pair is already known).
 */
export type PlayerRepo = {
  findByProvider(provider: PlayerProvider, providerId: string): Player | null;
  findById(playerId: string): Player | null;
  create(player: Player): Player;
};

/**
 * A server-issued bearer token, stored hashed. Only `tokenHash` is ever
 * persisted — the plaintext token is returned to the client exactly once at
 * issue time (tokenService).
 */
export type TokenRecord = {
  /** sha256(token) — primary key. */
  tokenHash: string;
  playerId: string;
  /** Epoch milliseconds; enforced by the auth middleware. */
  expiresAt: number;
  /** Epoch milliseconds. */
  createdAt: number;
};

/** Token repository keyed by token hash. A player may hold multiple tokens. */
export type TokenRepo = {
  create(token: TokenRecord): void;
  findByHash(tokenHash: string): TokenRecord | null;
};
