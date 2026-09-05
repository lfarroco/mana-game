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
 *
 * Concurrency: action dispatch runs inside `SessionRepo.update` — an atomic
 * read-modify-write (a Firestore transaction on the Functions backend), so
 * concurrent actions from one player serialize instead of interleaving. The
 * updater passed to it (`dispatchAction`) is pure: ghost snapshots, matchup
 * records, rating updates, and run completions all happen outside, and the
 * repos guard the exactly-once cases per session id.
 *
 * Retries: `handleAction` accepts the client's `clientActionId`. The first
 * completed attempt stores its wire response in the idempotency repo; a retry
 * with the same key replays those bytes instead of running the transition
 * again (matters on serverless, where client-visible timeouts are common).
 */

import { randomInt } from "node:crypto";
import { v4 as uuid } from "uuid";
import * as SessionManagement from "@game/session/SessionManagement";
import * as SessionTransitions from "@game/session/SessionTransitions";
import * as CombatCodec from "@game/Combat/CombatCodec";
import { formatNumericSeed, MAX_SEED_BOUND } from "@game/session/seed";
import type { SessionData } from "@game/types/session";
import type { Action, ActionResponse } from "@game/types/action";
import { ApiError } from "../errors";
import type {
  GhostRepo,
  IdempotencyRecord,
  IdempotencyRepo,
  PlayerRepo,
  PlayerStatsRepo,
  RatingRepo,
  SessionRepo,
} from "../persistence/repositories";
import {
  createMemoryGhostRepo,
  createMemoryIdempotencyRepo,
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
import {
  DEFAULT_PLAYER_RATING,
  applyRatingDelta,
  getMultiplayerVictoryTier,
} from "./rating";

/** Maximum entries kept in session.action_log. */
const MAX_ACTION_LOG_SIZE = 100;

/** Optional persistence for matchmaking/rating (defaults to fresh memory repos). */
export type SessionServiceDeps = {
  ghostRepo?: GhostRepo;
  ratingRepo?: RatingRepo;
  playerRepo?: PlayerRepo;
  /** Run-completions repo — career/season victory stats (defaults to memory). */
  playerStatsRepo?: PlayerStatsRepo;
  /** Action-idempotency store (defaults to a fresh memory repo). */
  idempotencyRepo?: IdempotencyRepo;
};

export type SessionService = {
  createSession(
    playerId: string,
    request: CreateSessionRequest,
  ): Promise<SessionData>;
  /**
   * The player's active session, or null when none is active. A session whose
   * run has finished (terminal phase) is intentionally **not** served — the
   * server owns the lifecycle and the player can only create a new session.
   */
  getSession(playerId: string): Promise<SessionData | null>;
  /**
   * Dispatch one action. `clientActionId` makes retries safe: a repeated key
   * replays the stored response instead of re-running the transition.
   */
  handleAction(
    playerId: string,
    action: Action,
    clientActionId?: string,
  ): Promise<ActionResponse>;
};

export function createSessionService(
  repo: SessionRepo,
  deps: SessionServiceDeps = {},
): SessionService {
  const ghostRepo = deps.ghostRepo ?? createMemoryGhostRepo();
  const ratingRepo = deps.ratingRepo ?? createMemoryRatingRepo();
  const playerRepo = deps.playerRepo ?? createMemoryPlayerRepo();
  const playerStatsRepo = deps.playerStatsRepo ?? createMemoryPlayerStatsRepo();
  const idempotencyRepo = deps.idempotencyRepo ?? createMemoryIdempotencyRepo();

  // Defense in depth: the terminal-phase guard in dispatchAction already blocks
  // a second end_combat on a finished run, so the rating delta can never be
  // applied twice through the API. This set additionally guards against any
  // future re-entrancy path re-dispatching the same terminal transition.
  const appliedRatingSessionIds = new Set<string>();

  return {
    async createSession(playerId, request) {
      const existing = await repo.get(playerId);
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
        await repo.delete(playerId);
      }

      // The server generates the seed — it is the replay authority. Numeric
      // to match the single-player numpad input / run-complete display.
      const seed = formatNumericSeed(randomInt(0, MAX_SEED_BOUND));
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
      if (!(await ratingRepo.get(playerId))) {
        await ratingRepo.upsert({
          playerId,
          rating: DEFAULT_PLAYER_RATING,
          updatedAt: Date.now(),
        });
      }

      await repo.upsert(playerId, session);
      return session;
    },

    async getSession(playerId) {
      const session = await repo.get(playerId);
      // A finished (terminal-phase) run is no longer served: the player can
      // only create a new session. The client learns the run ended from the
      // terminal session in the action response, not from a later GET.
      if (session && isTerminalPhase(session.phase)) return null;
      return session;
    },

    async handleAction(playerId, action, clientActionId) {
      // Safe retry: a repeated idempotency key replays the stored response.
      if (clientActionId) {
        const replay = await idempotencyRepo.find(playerId, clientActionId);
        if (replay) return replayActionResponse(replay);
      }

      // start_combat is special: ghost snapshot + opponent resolution first
      // (side effects, outside the transaction), then the transaction
      // receives the resolved enemy as an override.
      let prep: StartCombatPrep | undefined;
      if (action.type === "start_combat") {
        prep = await prepareStartCombat(playerId);
      }

      const result = await repo.update(playerId, (current) =>
        dispatchAction(current, playerId, action, prep),
      );

      // Run completion: apply the wins-based rating delta exactly once. The
      // terminal-phase guard inside the transaction makes a duplicate
      // end_combat impossible through the API; the session-id set below and
      // the idempotent repos are the second and third lines of defense.
      if (
        action.type === "end_combat" &&
        isTerminalPhase(result.session.phase) &&
        !appliedRatingSessionIds.has(result.session.id)
      ) {
        appliedRatingSessionIds.add(result.session.id);
        const completedAt = Date.now();
        const currentRating =
          (await ratingRepo.get(playerId))?.rating ?? DEFAULT_PLAYER_RATING;
        await ratingRepo.upsert({
          playerId,
          rating: applyRatingDelta({
            currentRating,
            wins: result.session.wins,
          }),
          updatedAt: completedAt,
        });

        // Record the finished run once for the lobby's career + season victory
        // stats. The repos are idempotent per session id (PK / Map key), so
        // even a future re-entrancy path can't double-count.
        await playerStatsRepo.recordRunCompletion({
          sessionId: result.session.id,
          playerId,
          tier: getMultiplayerVictoryTier(result.session.wins),
          wins: result.session.wins,
          completedAt,
        });
      }

      if (clientActionId) {
        await idempotencyRepo.save(
          toIdempotencyRecord(playerId, clientActionId, result),
        );
      }
      return result;
    },
  };

  /**
   * Matchmaking orchestration for a start_combat:
   *   1. snapshot the player's board team as a ghost for the current round,
   *   2. resolve the opponent (ghost pick → PvE fallback — always a match),
   *   3. record the PvP matchup so this run doesn't rematch the same player.
   *
   * Runs before the session transaction (it performs repo writes). Opponent
   * display names are pre-fetched into a sync lookup so the pure matchmaking
   * module never touches the repos.
   */
  async function prepareStartCombat(
    playerId: string,
  ): Promise<StartCombatPrep> {
    const session = await repo.get(playerId);
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

    const rating =
      (await ratingRepo.get(session.player_id))?.rating ??
      DEFAULT_PLAYER_RATING;

    const ghost = snapshotGhost({
      playerId: session.player_id,
      sessionId: session.id,
      round: session.round,
      team: session.team?.units ?? [],
      rating,
      createdAt: Date.now(),
    });
    if (ghost) {
      await ghostRepo.create(ghost);
    }

    const ghosts = await ghostRepo.findByRound(session.round);
    const displayNames = new Map<string, string>();
    await Promise.all(
      ghosts.map(async (candidate) => {
        const owner = await playerRepo.findById(candidate.playerId);
        if (owner?.displayName)
          displayNames.set(candidate.playerId, owner.displayName);
      }),
    );

    const resolution = resolveOpponent({
      ghosts,
      playerId: session.player_id,
      rating,
      round: session.round,
      wins: session.wins,
      seed: session.seed,
      recentlyFought: await ghostRepo.getRecentOpponents(session.player_id),
      displayNameFor: (opponentPlayerId) => displayNames.get(opponentPlayerId),
    });

    if (resolution.opponentPlayerId) {
      await ghostRepo.recordMatchup(
        session.player_id,
        resolution.opponentPlayerId,
      );
    }

    return { resolution };
  }
}

/** Resolved opponent threaded into the start_combat transition. */
type StartCombatPrep = {
  resolution: OpponentResolution;
};

/**
 * Pure action dispatch — the unit that runs inside `SessionRepo.update`
 * (and may be retried under contention), so: no repo access, no side
 * effects. Throws ApiError for missing/finished sessions (404/409) and
 * rejected actions (422).
 */
function dispatchAction(
  current: SessionData | null,
  playerId: string,
  action: Action,
  prep?: StartCombatPrep,
): ActionResponse {
  if (!current) {
    throw new ApiError(
      404,
      "no_active_session",
      `No active session for player '${playerId}'`,
    );
  }

  if (current.phase === "victory" || current.phase === "game_over") {
    throw new ApiError(
      409,
      "session_finished",
      `Session is already in terminal phase '${current.phase}'`,
    );
  }

  let result: ActionResponse;
  try {
    if (action.type === "start_combat") {
      if (!prep) {
        throw new Error("start_combat dispatched without opponent prep");
      }
      result = SessionTransitions.transitionToNextState(
        current,
        { type: "start_combat" },
        {
          enemyTeam: prep.resolution.enemyTeam,
          enemyPlayerName: prep.resolution.enemyPlayerName,
        },
      );
      // Record the action for audit/replay debugging. start_combat carries
      // the resolved opponent (ghost id / PvE marker) so the action log
      // doubles as the matchup record for the run.
      appendActionLog(result.session, action.type, {
        enemyPlayerName: prep.resolution.enemyPlayerName,
        ghostId: prep.resolution.ghostId,
        opponentPlayerId: prep.resolution.opponentPlayerId,
      });
    } else {
      result = SessionTransitions.transitionToNextState(current, action);
      appendActionLog(result.session, action.type);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const message =
      err instanceof Error ? err.message : "Action rejected by game logic";
    throw new ApiError(422, "action_rejected", message);
  }

  return result;
}

/** Append one audit entry to the session action log (trimmed). */
function appendActionLog(
  session: SessionData,
  actionType: string,
  payload?: Record<string, unknown>,
): void {
  const log = session.action_log ?? [];
  log.push(
    payload
      ? { action: actionType, payload, timestamp: Date.now() }
      : { action: actionType, timestamp: Date.now() },
  );
  session.action_log = log.slice(-MAX_ACTION_LOG_SIZE);
}

/**
 * Rebuild an ActionResponse from a stored idempotency record. The bytes match
 * the first attempt: same stripped session, same combat DTO (deserialized so
 * the route serializes it back identically).
 */
function replayActionResponse(record: IdempotencyRecord): ActionResponse {
  const session = parseStoredSession(record.sessionJson);
  if (record.combatJson) {
    const combatState = CombatCodec.deserializeCombatState(
      JSON.parse(record.combatJson) as CombatCodec.CombatStateDto,
    );
    session.combatState = combatState;
    return { session, combatState };
  }
  return { session };
}

/** Pack a completed dispatch into a write-once idempotency record. */
function toIdempotencyRecord(
  playerId: string,
  key: string,
  result: ActionResponse,
): IdempotencyRecord {
  const { combatState, ...rest } = result.session;
  return {
    playerId,
    key,
    sessionJson: JSON.stringify(rest),
    combatJson: combatState
      ? JSON.stringify(CombatCodec.serializeCombatState(combatState))
      : null,
    createdAt: Date.now(),
  };
}

/** JSON.parse with Date normalization (`updated_at` stringifies to ISO). */
function parseStoredSession(json: string): SessionData {
  const session = JSON.parse(json) as SessionData;
  if (typeof session.updated_at === "string") {
    session.updated_at = new Date(session.updated_at);
  }
  return session;
}

function isTerminalPhase(phase: SessionData["phase"]): boolean {
  return phase === "victory" || phase === "game_over";
}
