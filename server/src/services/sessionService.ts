/**
 * Session service — the server's application layer over core game logic.
 *
 * Wraps core SessionManagement / SessionTransitions for the Express API,
 * owns persistence via the SessionRepo, and enforces server-side rules:
 *   - the server owns the session lifecycle: the client can never declare a
 *     run finished or abandon it (no client-delete path exists),
 *   - a run finishes when core transitions it to a terminal phase
 *     (`victory` / `game_over`, derived from wins / lives lost); the terminal
 *     session is returned once in the action response so the client can show
 *     the results screen, and from then on the session is **not served**
 *     (`getSession` → null) and **does not block** a new run (create
 *     supersedes it),
 *   - one active (non-terminal) session per player (409 on a second create),
 *   - actions rejected with 409 once a run reaches a terminal phase,
 *   - the server generates the session seed (it is the replay authority),
 *   - `start_combat` snapshots the player's team as a ghost for the round,
 *     resolves an opponent via matchmaking (ghost pick → PvE fallback), and
 *     threads `{ enemyTeam, enemyPlayerName }` into core's transition options,
 *   - `end_combat` resolving to a terminal phase applies the wins-based rating
 *     delta exactly once (per session id).
 */

import { v4 as uuid } from "uuid";
import * as SessionManagement from "@game/session/SessionManagement";
import * as SessionTransitions from "@game/session/SessionTransitions";
import type { SessionData } from "@game/types/session";
import type { Action, ActionResponse } from "@game/types/action";
import { ApiError } from "../errors";
import type {
  GhostRepo,
  PlayerRepo,
  PlayerStatsRepo,
  RatingRepo,
  SessionRepo,
} from "../persistence/repositories";
import {
  createMemoryGhostRepo,
  createMemoryPlayerRepo,
  createMemoryPlayerStatsRepo,
  createMemoryRatingRepo,
} from "../persistence/memory";
import type { CreateSessionRequest } from "../dto";
import {
  type OpponentResolution,
  resolveOpponent,
  snapshotGhost,
} from "./matchmaking";
import { DEFAULT_PLAYER_RATING, applyRatingDelta, getMultiplayerVictoryTier } from "./rating";

/** Maximum entries kept in session.action_log. */
const MAX_ACTION_LOG_SIZE = 100;

/** Optional persistence for matchmaking/rating (defaults to fresh memory repos). */
export type SessionServiceDeps = {
  ghostRepo?: GhostRepo;
  ratingRepo?: RatingRepo;
  playerRepo?: PlayerRepo;
  /** Run-completions repo — career/season victory stats (defaults to memory). */
  playerStatsRepo?: PlayerStatsRepo;
};

export type SessionService = {
  createSession(playerId: string, request: CreateSessionRequest): SessionData;
  /**
   * The player's active session, or null when none is active. A session whose
   * run has finished (terminal phase) is intentionally **not** served — the
   * server owns the lifecycle and the player can only create a new session.
   */
  getSession(playerId: string): SessionData | null;
  handleAction(playerId: string, action: Action): ActionResponse;
};

export function createSessionService(
  repo: SessionRepo,
  deps: SessionServiceDeps = {},
): SessionService {
  const ghostRepo = deps.ghostRepo ?? createMemoryGhostRepo();
  const ratingRepo = deps.ratingRepo ?? createMemoryRatingRepo();
  const playerRepo = deps.playerRepo ?? createMemoryPlayerRepo();
  const playerStatsRepo =
    deps.playerStatsRepo ?? createMemoryPlayerStatsRepo();

  // Defense in depth: the terminal-phase guard in handleAction already blocks
  // a second end_combat on a finished run, so the rating delta can never be
  // applied twice through the API. This set additionally guards against any
  // future re-entrancy path re-dispatching the same terminal transition.
  const appliedRatingSessionIds = new Set<string>();

  return {
    createSession(playerId, request) {
      const existing = repo.get(playerId);
      if (existing && !isTerminalPhase(existing.phase)) {
        throw new ApiError(
          409,
          "session_already_exists",
          `Player '${playerId}' already has an active session (phase '${existing.phase}'). Finish the run first.`,
        );
      }

      // A finished run does not block a new one: the server owns the session
      // lifecycle, so creating a session supersedes the previous (finished)
      // session instead of requiring a client-side delete.
      if (existing) {
        repo.delete(playerId);
      }

      // The server generates the seed — it is the replay authority.
      const seed = uuid();
      const session = SessionManagement.createInitialSession(
        playerId,
        seed,
        request.crystalId,
      );

      session.id = uuid();
      session.session_type = {
        type: "multiplayer",
        queueType: request.queueType ?? "casual",
      };

      // First session for this player: initialize the default rating (1000).
      // Later runs read and update this record on completion.
      if (!ratingRepo.get(playerId)) {
        ratingRepo.upsert({
          playerId,
          rating: DEFAULT_PLAYER_RATING,
          updatedAt: Date.now(),
        });
      }

      repo.upsert(playerId, session);
      return session;
    },

    getSession(playerId) {
      const session = repo.get(playerId);
      // A finished (terminal-phase) run is no longer served: the player can
      // only create a new session. The client learns the run ended from the
      // terminal session in the action response, not from a later GET.
      if (session && isTerminalPhase(session.phase)) return null;
      return session;
    },

    handleAction(playerId, action) {
      const session = repo.get(playerId);
      if (!session) {
        throw new ApiError(
          404,
          "no_active_session",
          `No active session for player '${playerId}'`,
        );
      }

      if (session.phase === "victory" || session.phase === "game_over") {
        throw new ApiError(
          409,
          "session_finished",
          `Session is already in terminal phase '${session.phase}'`,
        );
      }

      let result: ActionResponse;
      // start_combat is special: ghost snapshot + opponent resolution first,
      // then the transition receives the resolved enemy as an override.
      let startCombatLog: Record<string, unknown> | undefined;
      try {
        if (action.type === "start_combat") {
          const combat = runStartCombat(session);
          result = combat.result;
          startCombatLog = {
            enemyPlayerName: combat.resolution.enemyPlayerName,
            ghostId: combat.resolution.ghostId,
            opponentPlayerId: combat.resolution.opponentPlayerId,
          };
        } else {
          result = SessionTransitions.transitionToNextState(session, action);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Action rejected by game logic";
        throw new ApiError(422, "action_rejected", message);
      }

      // Run completion: apply the wins-based rating delta exactly once.
      // The session_finished 409 above makes a duplicate end_combat impossible
      // through the API; the session-id set is the second line of defense.
      if (
        action.type === "end_combat" &&
        isTerminalPhase(result.session.phase) &&
        !appliedRatingSessionIds.has(session.id)
      ) {
        appliedRatingSessionIds.add(session.id);
        const completedAt = Date.now();
        const currentRating =
          ratingRepo.get(playerId)?.rating ?? DEFAULT_PLAYER_RATING;
        ratingRepo.upsert({
          playerId,
          rating: applyRatingDelta({
            currentRating,
            wins: result.session.wins,
          }),
          updatedAt: completedAt,
        });

        // Record the finished run once for the lobby's career + season victory
        // stats. The repos are idempotent per session id (SQLite PK / memory
        // Map key), so even a future re-entrancy path can't double-count.
        playerStatsRepo.recordRunCompletion({
          sessionId: session.id,
          playerId,
          tier: getMultiplayerVictoryTier(result.session.wins),
          wins: result.session.wins,
          completedAt,
        });
      }

      // Record the action for audit/replay debugging (trimmed). start_combat
      // carries the resolved opponent (ghost id / PvE marker) so the action
      // log doubles as the matchup record for the run.
      const log = result.session.action_log ?? [];
      log.push(
        startCombatLog
          ? {
              action: action.type,
              payload: startCombatLog,
              timestamp: Date.now(),
            }
          : { action: action.type, timestamp: Date.now() },
      );
      result.session.action_log = log.slice(-MAX_ACTION_LOG_SIZE);

      repo.upsert(playerId, result.session);
      return result;
    },
  };

  /**
   * Matchmaking orchestration for a start_combat:
   *   1. snapshot the player's board team as a ghost for the current round,
   *   2. resolve the opponent (ghost pick → PvE fallback — always a match),
   *   3. record the PvP matchup so this run doesn't rematch the same player,
   *   4. run combat via core with the resolved enemy team/name.
   */
  function runStartCombat(session: SessionData): {
    result: ActionResponse;
    resolution: OpponentResolution;
  } {
    const rating =
      ratingRepo.get(session.player_id)?.rating ?? DEFAULT_PLAYER_RATING;

    const ghost = snapshotGhost({
      playerId: session.player_id,
      sessionId: session.id,
      round: session.round,
      team: session.team?.units ?? [],
      rating,
      createdAt: Date.now(),
    });
    if (ghost) {
      ghostRepo.create(ghost);
    }

    const resolution = resolveOpponent({
      ghosts: ghostRepo.findByRound(session.round),
      playerId: session.player_id,
      rating,
      round: session.round,
      wins: session.wins,
      seed: session.seed,
      recentlyFought: ghostRepo.getRecentOpponents(session.player_id),
      displayNameFor: (opponentPlayerId) =>
        playerRepo.findById(opponentPlayerId)?.displayName,
    });

    if (resolution.opponentPlayerId) {
      ghostRepo.recordMatchup(session.player_id, resolution.opponentPlayerId);
    }

    const result = SessionTransitions.transitionToNextState(
      session,
      { type: "start_combat" },
      {
        enemyTeam: resolution.enemyTeam,
        enemyPlayerName: resolution.enemyPlayerName,
      },
    );

    return { result, resolution };
  }
}

function isTerminalPhase(phase: SessionData["phase"]): boolean {
  return phase === "victory" || phase === "game_over";
}

