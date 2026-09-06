/**
 * Repository interfaces for server persistence.
 *
 * All methods are async (Firestore has no sync API). Three backends implement
 * them — in-memory (memory.ts, tests/dev), durable SQLite (sqlite.ts, the VM
 * path), and Firestore (firestore.ts, the Firebase backend) — so the app
 * layer never changes.
 */

import type { SessionData } from "@game/types/session";
import type { Unit } from "@game/types/unit";
import type { ActionResponse } from "@game/types/action";

/**
 * Atomic read-modify-write on one player's session. The updater is pure —
 * backends may retry it under contention (Firestore transactions do), so it
 * must not perform side effects (no ghost/rating writes inside). It throws
 * `ApiError` for missing/finished sessions and rejected actions, exactly as
 * the old get-then-upsert sequence did.
 */
export type SessionUpdater = (current: SessionData | null) => ActionResponse;

/**
 * Session repository keyed by player id — one active session per player.
 * All methods are async: Firestore (the Functions backend) has no sync API,
 * and the in-memory/SQLite backends wrap their sync work in promises so the
 * app layer sees one shape.
 */
export type SessionRepo = {
  get(playerId: string): Promise<SessionData | null>;
  upsert(playerId: string, session: SessionData): Promise<void>;
  delete(playerId: string): Promise<void>;
  /**
   * Run `updater` against the stored session and persist the returned
   * session atomically. On Firestore this is a transaction (serializes
   * concurrent actions from the same player across instances); on SQLite a
   * write transaction; on memory (single process) a plain apply.
   */
  update(playerId: string, updater: SessionUpdater): Promise<ActionResponse>;
};

/**
 * Identity provider for a player account. `steam` (Electron), `itch`
 * (web build), and `google` (Android / web sign-in) are the login providers
 * (docs/auth.md, docs/itchio-auth.md, docs/android-multiplayer.md); `guest`
 * is a credential-less account that converts to itch/google on link.
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
  /**
   * steamid64 for steam, itch user id for itch, `sub` for google, and a
   * server-generated uuid for guests (unique per guest — guests have no
   * credential to look up, so every guest login mints a fresh player).
   */
  providerId: string;
  /**
   * Display name. Steam persona (unverified client-supplied, docs/auth.md),
   * itch username (server-verified), the Google profile name (server-
   * verified), or the generated guest handle at creation. Non-guest players
   * may change it once per 30 days (`displayNameUpdatedAt` tracks the
   * cooldown) — see `playerService.updateDisplayName`.
   */
  displayName?: string;
  /**
   * Epoch milliseconds of the last display-name change. Unset = the player has
   * never renamed, so the first change is always allowed.
   */
  displayNameUpdatedAt?: number;
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
  findByProvider(
    provider: PlayerProvider,
    providerId: string,
  ): Promise<Player | null>;
  findById(playerId: string): Promise<Player | null>;
  create(player: Player): Promise<Player>;
  /**
   * Set the display name and stamp `displayNameUpdatedAt` (the 30-day rename
   * cooldown). Returns the updated player, or null when the player does not
   * exist. The caller owns validation + cooldown enforcement
   * (`playerService.updateDisplayName`).
   */
  updateDisplayName(
    playerId: string,
    displayName: string,
    updatedAt: number,
  ): Promise<Player | null>;
  /**
   * Convert a guest account into a regular one: re-point the player at the
   * linked (provider, providerId) identity. The display name is kept (the
   * guest's handle, random or chosen, stays theirs). Returns the updated
   * player, or null when the player does not exist. The caller owns
   * precondition checks (guest-only, no existing link) —
   * `playerService.convertGuestAccount`.
   */
  updateProvider(
    playerId: string,
    provider: PlayerProvider,
    providerId: string,
  ): Promise<Player | null>;
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
  create(token: TokenRecord): Promise<void>;
  findByHash(tokenHash: string): Promise<TokenRecord | null>;
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
  create(ghost: NewGhost): Promise<Ghost>;
  findByRound(round: number): Promise<Ghost[]>;
  /**
   * Remember that `playerId` fought `opponentPlayerId` (a ghost owner). The
   * list is capped per player; entries fall off as newer matchups are added.
   */
  recordMatchup(playerId: string, opponentPlayerId: string): Promise<void>;
  /** Opponent player ids this player recently fought, oldest first. */
  getRecentOpponents(playerId: string): Promise<string[]>;
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
  get(playerId: string): Promise<Rating | null>;
  upsert(rating: Rating): Promise<void>;
  /**
   * Top ratings in leaderboard order (rating DESC, playerId ASC tiebreak),
   * paginated. Powers `GET /api/v1/players/ranking` (20 per page).
   */
  listTop(limit: number, offset: number): Promise<Rating[]>;
  /** Number of stored ratings (players who have a rating row). */
  count(): Promise<number>;
  /**
   * Number of stored ratings ordered strictly above `(rating, playerId)` in
   * leaderboard order — i.e. `rating` greater, or equal with a smaller
   * playerId. The viewer's rank is `1 + countAbove(...)`, which also works
   * for players with no rating row yet (effective rating = default).
   */
  countAbove(rating: number, playerId: string): Promise<number>;
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
  recordRunCompletion(completion: RunCompletion): Promise<void>;
  /** Count tiered victories completed at or after `sinceEpochMs`. */
  getVictoryCounts(
    playerId: string,
    sinceEpochMs: number,
  ): Promise<VictoryCounts>;
};

/**
 * Action-idempotency record — lets clients safely retry an action after a
 * timeout (common on serverless cold starts). The stored payload is the
 * wire response: the session JSON (without the live Map-carrying
 * CombatState) plus the serialized combat DTO, so a replay returns bytes
 * identical to the first attempt.
 */
export type IdempotencyRecord = {
  playerId: string;
  /** Client-supplied `clientActionId` for one action dispatch. */
  key: string;
  /** `SessionData` (combat state stripped) as JSON. */
  sessionJson: string;
  /** Serialized `CombatStateDto` as JSON, or null when no combat resulted. */
  combatJson: string | null;
  /** Epoch milliseconds. */
  createdAt: number;
};

/**
 * Action-idempotency store keyed by (playerId, key). Entries are
 * write-once per key — the first completed attempt wins; concurrent
 * duplicates resolve to the same stored response.
 */
export type IdempotencyRepo = {
  find(playerId: string, key: string): Promise<IdempotencyRecord | null>;
  save(record: IdempotencyRecord): Promise<void>;
};
