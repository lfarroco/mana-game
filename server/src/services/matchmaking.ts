/**
 * Matchmaking service — async "ghost" PvP opponent selection.
 *
 * Pure, injectable, deterministic-friendly functions (no Math.random, no I/O):
 * the session service owns persistence and calls these with repo data.
 *
 * Ported and adapted from the retired Supabase backend
 * (`phaser/supabase/functions/action/matchmaking.ts`, deleted in Phase 3):
 *   - `sanitizeEnemyTeam` / `hasValidCombatTeam` — adapted to the current core
 *     Unit shape (position is a `[x, y]` tuple, not `{ x, y }`).
 *   - `persistRoundGhost` → `snapshotGhost` (pure normalization; persistence
 *     stays in the repo).
 *   - `selectRoundGhostOpponent` → `resolveOpponent` (no Supabase client).
 *
 * Model (docs/game-server.md): on every `start_combat` the player's team is
 * snapshotted as a ghost for that round; the opponent is the closest-rated
 * ghost of the same round within a widening rating band (±150 start), excluding
 * self and recently-fought players; when nothing qualifies, the PvE fallback
 * (`EnemyGeneration.generateEnemyTeamForRound`) guarantees a match.
 */

import type { Unit } from "@game/types/unit";
import * as EnemyGeneration from "@game/session/EnemyGeneration";
import { FORCE_ID_CPU, MAX_PARTY_SIZE } from "@game/math/Constants";
import type { Ghost, NewGhost } from "../persistence/repositories";
import { DEFAULT_PLAYER_RATING } from "./rating";

/** Starting rating band around the player's rating (docs/game-server.md). */
export const DEFAULT_RATING_BAND = 150;
/** How much the band widens on each miss. */
export const DEFAULT_BAND_WIDEN_STEP = 150;
/**
 * How many times the band widens before giving up to the PvE fallback
 * (band = base + step × maxSteps → up to 600 at defaults).
 */
export const DEFAULT_MAX_BAND_WIDEN_STEPS = 3;
/** Display name for the PvE fallback enemy (no ghost matched). */
export const PVE_ENEMY_NAME = "PvE";
/** Display name fallback for a ghost whose owner has no known display name. */
export const GUEST_ENEMY_NAME = "Guest";

/** Input for `snapshotGhost` — a team snapshot before the repo assigns ids. */
export type GhostSnapshotInput = {
  playerId: string;
  sessionId: string;
  round: number;
  team: Unit[];
  rating: number;
  createdAt: number;
};

/** The resolved opponent for a combat — a match is always guaranteed. */
export type OpponentResolution = {
  enemyTeam: Unit[];
  enemyPlayerName: string;
  /** The picked ghost's id, or null when the PvE fallback was used. */
  ghostId: string | null;
  /** The ghost owner's player id, or null for PvE. */
  opponentPlayerId: string | null;
};

export type PickOpponentParams = {
  ghosts: readonly Ghost[];
  playerId: string;
  rating: number;
  round: number;
  /** Current rating band (widen via resolveOpponent for repeated misses). */
  ratingBand: number;
  /** Opponent player ids to exclude (recently fought this run). */
  recentlyFought?: readonly string[];
};

export type ResolveOpponentParams = {
  ghosts: readonly Ghost[];
  playerId: string;
  rating: number;
  round: number;
  wins: number;
  seed: string;
  recentlyFought?: readonly string[];
  /** Starting band (default DEFAULT_RATING_BAND). */
  ratingBand?: number;
  /** Band growth per miss (default DEFAULT_BAND_WIDEN_STEP). */
  bandWidenStep?: number;
  /** Widening attempts before falling back to PvE (default 3). */
  maxBandWidenSteps?: number;
  /** Resolves a ghost owner's display name (Steam persona). */
  displayNameFor?: (opponentPlayerId: string) => string | undefined;
};

/** Floor + clamp a rating to a sane non-negative integer. */
export function normalizePlayerRating(
  rawValue: unknown,
  fallback: number = DEFAULT_PLAYER_RATING,
): number {
  const raw = Number(rawValue ?? fallback);
  if (Number.isNaN(raw) || raw < 0) {
    return fallback;
  }
  return Math.floor(raw);
}

/**
 * A ghost is only worth fighting if it carries a board team with a core unit
 * (an empty/corrupt snapshot would crash combat simulation).
 */
export function hasValidCombatTeam(team: readonly Unit[]): boolean {
  if (!Array.isArray(team) || team.length === 0) return false;
  return team.some(
    (unit) =>
      Boolean(unit) &&
      typeof unit === "object" &&
      Boolean((unit as Unit).isCore),
  );
}

function clampBoardIndex(value: number): number {
  return Math.max(0, Math.min(2, Math.floor(value)));
}

/**
 * Normalize a snapshotted team into a combat-ready CPU team: clamp positions
 * to the 3×3 board, rewrite ids to be unique for the match, force CPU, and
 * fight at full life. Ported from the retired backend's `sanitizeEnemyTeam`.
 */
export function sanitizeEnemyTeam(team: readonly Unit[]): Unit[] {
  return team.slice(0, MAX_PARTY_SIZE).map((unit, index) => {
    const source = unit && typeof unit === "object" ? unit : ({} as Unit);
    const rawX = Array.isArray(source.position) ? source.position[0] : index % 3;
    const rawY = Array.isArray(source.position)
      ? source.position[1]
      : Math.floor(index / 3);
    const x = clampBoardIndex(Number(rawX) || 0);
    const y = clampBoardIndex(Number(rawY) || 0);
    const maxLife = Math.max(
      1,
      Math.floor(Number(source.maxLife ?? source.life ?? 1)),
    );

    return {
      ...source,
      id: `match-${source.cardId ?? source.id ?? "unit"}-${index}`,
      force: FORCE_ID_CPU,
      position: [x, y],
      maxLife,
      life: maxLife,
    };
  });
}
/**
 * Normalize a team snapshot into a storable ghost, or null when there is
 * nothing worth storing (round < 1 or no combat-valid team). The team is
 * sanitized so stored ghosts are already combat-ready and never alias the
 * live session team.
 */
export function snapshotGhost(input: GhostSnapshotInput): NewGhost | null {
  if (!Number.isInteger(input.round) || input.round < 1) {
    return null;
  }
  if (!hasValidCombatTeam(input.team)) {
    return null;
  }
  return {
    playerId: input.playerId,
    sessionId: input.sessionId,
    round: input.round,
    team: sanitizeEnemyTeam(input.team),
    rating: normalizePlayerRating(input.rating),
    createdAt: input.createdAt,
  };
}

/**
 * Pick the best candidate ghost for a player: same round, rating within band,
 * excluding self and recently-fought players, with a combat-valid team. "Best"
 * is deterministic — closest rating, then lowest rating, then player id —
 * so identical inputs always pick the same ghost (no Math.random).
 */
export function pickOpponent(params: PickOpponentParams): Ghost | null {
  const recentlyFought = new Set(params.recentlyFought ?? []);

  const candidates = params.ghosts
    .filter((ghost) => ghost.round === params.round)
    .filter((ghost) => ghost.playerId !== params.playerId)
    .filter((ghost) => !recentlyFought.has(ghost.playerId))
    .filter((ghost) => hasValidCombatTeam(ghost.team))
    .filter(
      (ghost) => Math.abs(ghost.rating - params.rating) <= params.ratingBand,
    )
    .sort(compareCandidates(params.rating));

  return candidates[0] ?? null;
}

function compareCandidates(
  targetRating: number,
): (left: Ghost, right: Ghost) => number {
  return (left, right) =>
    Math.abs(left.rating - targetRating) -
      Math.abs(right.rating - targetRating) ||
    left.rating - right.rating ||
    left.playerId.localeCompare(right.playerId);
}

/**
 * Resolve an opponent for a `start_combat`: try the ghost pool starting at the
 * base rating band, widening on each miss, then fall back to a generated PvE
 * team. Always returns an `OpponentResolution` — a match is guaranteed.
 */
export function resolveOpponent(
  params: ResolveOpponentParams,
): OpponentResolution {
  const baseBand = params.ratingBand ?? DEFAULT_RATING_BAND;
  const widenStep = params.bandWidenStep ?? DEFAULT_BAND_WIDEN_STEP;
  const maxSteps = params.maxBandWidenSteps ?? DEFAULT_MAX_BAND_WIDEN_STEPS;

  let band = baseBand;
  for (let step = 0; step <= maxSteps; step++) {
    const ghost = pickOpponent({
      ghosts: params.ghosts,
      playerId: params.playerId,
      rating: params.rating,
      round: params.round,
      ratingBand: band,
      recentlyFought: params.recentlyFought,
    });

    if (ghost) {
      const displayName = params.displayNameFor?.(ghost.playerId)?.trim();
      return {
        enemyTeam: sanitizeEnemyTeam(ghost.team),
        enemyPlayerName: displayName || GUEST_ENEMY_NAME,
        ghostId: ghost.ghostId,
        opponentPlayerId: ghost.playerId,
      };
    }

    band += widenStep;
  }

  return {
    enemyTeam: EnemyGeneration.generateEnemyTeamForRound(
      params.round,
      params.wins,
      params.seed,
    ),
    enemyPlayerName: PVE_ENEMY_NAME,
    ghostId: null,
    opponentPlayerId: null,
  };
}

