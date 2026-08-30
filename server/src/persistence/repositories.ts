/**
 * Repository interfaces for server persistence.
 *
 * v1 uses in-memory implementations (memory.ts). Phase 4 adds durable SQLite
 * implementations behind the same interfaces so the app layer never changes.
 */

import type { SessionData } from "@game/types/session";
import type { Unit } from "@game/types/unit";

/** Session repository keyed by player id — one active session per player. */
export type SessionRepo = {
  get(playerId: string): SessionData | null;
  upsert(playerId: string, session: SessionData): void;
  delete(playerId: string): void;
};

/**
 * Identity provider for a player account. `steam` (Electron), `itch`
 * (web build), and `google` (Android / web sign-in) are the enabled providers
 * (docs/auth.md, docs/itchio-auth.md, docs/android-multiplayer.md); `guest`
 * is a future phase.
 */
export type PlayerProvider = "steam" | "itch" | "google" | "guest";

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

/**
 * An async-PvP "ghost" — a snapshot of a player's board team at a given round,
 * stored on every `start_combat` so future runs can fight it as an opponent.
 * The team is sanitized at snapshot time (clamped positions, CPU force, full
 * life) so it is always combat-ready when picked.
 */
export type Ghost = {
  /** Server-generated uuid (assigned by the repo on create). */
  ghostId: string;
  /** The player who owned this team. */
  playerId: string;
  /** The session this ghost was snapshotted from. */
  sessionId: string;
  /** The round this team fought at — opponents are matched on same round. */
  round: number;
  team: Unit[];
  /** The owner's rating at snapshot time (opponent pick rating band). */
  rating: number;
  /** Epoch milliseconds. */
  createdAt: number;
};

/** Ghost input before the repo assigns a `ghostId`. */
export type NewGhost = Omit<Ghost, "ghostId">;

/**
 * Ghost repository — round-addressable snapshots plus a per-player "recently
 * fought" log used to avoid rematching the same opponent within one run
 * (in-memory v1; SQLite in Phase 4).
 */
export type GhostRepo = {
  create(ghost: NewGhost): Ghost;
  findByRound(round: number): Ghost[];
  /**
   * Remember that `playerId` fought `opponentPlayerId` (a ghost owner). The
   * list is capped per player; entries fall off as newer matchups are added.
   */
  recordMatchup(playerId: string, opponentPlayerId: string): void;
  /** Opponent player ids this player recently fought, oldest first. */
  getRecentOpponents(playerId: string): string[];
};

/**
 * A player's multiplayer rating. Wins-based deltas are applied on run
 * completion (rating service); a default of 1000 is initialized when a player
 * first creates a session.
 */
export type Rating = {
  playerId: string;
  rating: number;
  /** Epoch milliseconds of the last update. */
  updatedAt: number;
};

/** Rating repository keyed by player id — one rating per player. */
export type RatingRepo = {
  get(playerId: string): Rating | null;
  upsert(rating: Rating): void;
};

/**
 * Victory tier of a completed multiplayer run. Shared by the rating service
 * (`rating.ts` — `getMultiplayerVictoryTier`) and the run-completions record;
 * defined here so the persistence contract is the single source of truth.
 * Runs below the bronze threshold (5 wins) record `null`.
 */
export type MultiplayerVictoryTier = "bronze" | "silver" | "gold";

/**
 * A completed multiplayer run — recorded exactly once, when the run reaches a
 * terminal phase (`victory` / `game_over`). The basis for the career / season
 * victory stats shown in the multiplayer lobby (`GET /api/v1/players/me`).
 */
export type RunCompletion = {
  /**
   * Session id — the uniqueness key. Exactly one completion per run; the
   * SQLite `session_id` PK (and the in-memory Map key) make re-recording
   * idempotent.
   */
  sessionId: string;
  playerId: string;
  /** Gold/silver/bronze, or null for runs below the bronze threshold. */
  tier: MultiplayerVictoryTier | null;
  wins: number;
  /** Epoch milliseconds — the season boundary (1st of the month) compares against this. */
  completedAt: number;
};

/** Tiered victory counts for a player (career or a season window). */
export type VictoryCounts = {
  bronze: number;
  silver: number;
  gold: number;
};

/**
 * Run-completions repository — powers the multiplayer lobby's career + season
 * stats. `getVictoryCounts(playerId, 0)` is career; a `sinceEpochMs` of the
 * 1st of the current month is the season count.
 */
export type PlayerStatsRepo = {
  /** Record a completed run. Must be idempotent per sessionId. */
  recordRunCompletion(completion: RunCompletion): void;
  /** Count tiered victories completed at or after `sinceEpochMs`. */
  getVictoryCounts(playerId: string, sinceEpochMs: number): VictoryCounts;
};
