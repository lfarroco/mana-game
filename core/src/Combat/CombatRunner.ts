import {
  CombatEnvironment,
  CombatState,
  SessionData,
  Unit,
  DeferredEvent,
  Effect,
} from "../Models";
import * as TriggerSystem from "../TriggerSystem/TriggerSystem";
import * as Constants from "../math/Constants";
import * as Timeout from "./TimeoutDamageSystem";
import * as Poison from "./PoisonDamageSystem";
import * as Regen from "./RegenSystem";
import * as CombatStatsTracker from "./CombatStatsTracker";
import * as StatusEffectSystem from "./StatusEffectSystem";
import * as CombatLogger from "./CombatLogger";

const MAX_COMBAT_DURATION_MS = 120_000;

// Runaway guard (see workBudget in runCombat): a single frame processes at
// most this many due deferred events and fires at most this many threshold
// crossings — overflow carries over to the next frame. These cap per-frame
// work (the client runs updateFrame once per game tick, so one frame must
// never hang) while the total-work budget bounds the whole combat.
const MAX_DEFERRED_EVENTS_PER_FRAME = 1000;
const MAX_THRESHOLD_CROSSINGS_PER_FRAME = 500;

// Total combat work budget: deferred event executions + threshold crossings +
// unit casts. Legit combats use a few thousand at most (see the combat test
// suite); the budget guarantees a runaway board ends within bounded CPU time.
const MAX_COMBAT_WORK = 50_000;

// Total combat log budget. Log entries are the simulation's memory AND the
// client's playback workload: legit combats log a few hundred entries at most,
// so this caps a runaway board's log (and therefore playback) size instead of
// letting it balloon into an OOM or a multi-minute playback stretch (the
// client's FX-per-frame cap drains the timeline at a bounded rate).
const MAX_COMBAT_LOGS = 20_000;

export type CombatRunner = {
  updateFrame: (state: CombatState, time: number, delta: number) => void;
  finishCombat: (outcome: "player_won" | "player_lost" | "both_won") => void;
  isActive: () => boolean;
  stop: () => void;
  getEnv: () => CombatEnvironment;
};

type CombatRunnerState = {
  active: boolean;
  env: CombatEnvironment;
};

/**
 * Check if combat should end based on core life totals.
 */
const checkCombatOutcome = (
  state: CombatState,
): "player_won" | "player_lost" | "both_won" | null => {
  // Note: future PvP support should operate on a list of team ids
  // and return {winner: teamId} instead of hardcoded player/cpu.
  const playerCore = state.playerCore;
  const cpuCore = state.cpuCore;

  const playerDead = playerCore.life <= 0;
  const cpuDead = cpuCore.life <= 0;

  if (playerDead && cpuDead) {
    return "both_won";
  }
  if (playerDead) {
    return "player_lost";
  }
  if (cpuDead) {
    return "player_won";
  }

  return null;
};

export const runCombat = (
  session: SessionData,
  combatState: CombatState,
): CombatRunner => {
  // The session.seed is advanced during combat and saved back
  // after simulation completes (see CombatSimulation.ts).
  const env: CombatEnvironment = {
    seed: session.seed,
    combatState: combatState,
    logger: CombatLogger.createCombatLogger(),
    deferredEvents: [],
    combatStates: {
      poisonSystemState: Poison.initializePoisonSystem(),
      regenSystemState: Regen.initializeRegenSystem(),
      combatStatsTrackerState: CombatStatsTracker.initialize(combatState),
    },
  };

  const runnerState: CombatRunnerState = {
    active: true,
    env,
  };

  combatState.units.forEach((unit) => {
    const battleStartReactions = unit.reactions.filter(
      (reaction) => reaction.effectId === "on_battle_start",
    );

    battleStartReactions.forEach((reaction) => {
      TriggerSystem.processEffectsIO(env, unit, reaction.effects, true);
    });
  });

  let statusEffectSystemState = StatusEffectSystem.initialize(combatState);
  let timeoutSystemState = Timeout.initializeTimeoutDamageSystem();
  // ThresholdState tracks last threshold level fired per force:stat —
  // separate from CombatStatsTrackerState (unit/force stat accumulators).
  let thresholdState = CombatStatsTracker.initializeThresholds();
  let combatElapsedMs = 0;

  // Runaway guard — a hard budget on total combat work. Self-reinforcing
  // effect loops (e.g. every_10_regen → charge/haste/power → more regen) can
  // grow the simulation's per-frame work without bound; without this guard
  // such a board freezes the game (CPU melt / OOM) instead of resolving. Once
  // the budget is spent the combat ends gracefully (both_won, mirroring the
  // MAX_COMBAT_DURATION_MS timeout) with a runaway_combat log entry.
  let workBudget = MAX_COMBAT_WORK;

  /** Spend `units` of work budget. Returns true when the budget is exhausted. */
  const spendWork = (units: number): boolean => {
    workBudget -= units;
    return (
      workBudget <= 0 ||
      runnerState.env.logger.getLogs().length >= MAX_COMBAT_LOGS
    );
  };

  const finishCombatRunaway = () => {
    if (!runnerState.active) return;
    runnerState.env.logger.log({
      type: "runaway_combat",
    });
    finishCombat("both_won");
  };

  const updateFrame = (
    nextState: CombatState,
    _time: number,
    delta: number,
  ): void => {
    if (!runnerState.active) return;

    runnerState.env.combatState = nextState;

    combatElapsedMs += delta;

    runnerState.env.logger.setCurrentTimeMs(combatElapsedMs);

    // 0. Max duration check — first thing, before any damage, so
    //    cores that survived all previous frames get both_won
    if (combatElapsedMs >= MAX_COMBAT_DURATION_MS) {
      finishCombat("both_won");
      return;
    }

    // 1. Process deferred events that are due (projectiles landing this frame).
    //    The per-frame cap keeps a runaway effect loop from doing unbounded
    //    work in one frame — overflow stays queued for the next frame.
    const dueEvents: DeferredEvent[] = [];
    const remainingEvents: DeferredEvent[] = [];
    for (const event of runnerState.env.deferredEvents) {
      if (event.timeMs <= combatElapsedMs) {
        dueEvents.push(event);
      } else {
        remainingEvents.push(event);
      }
    }
    // Sort due events by time for deterministic processing
    dueEvents.sort((a, b) => a.timeMs - b.timeMs);
    const eventsToProcess = Math.min(
      dueEvents.length,
      MAX_DEFERRED_EVENTS_PER_FRAME,
    );
    for (let i = eventsToProcess; i < dueEvents.length; i++) {
      remainingEvents.push(dueEvents[i]);
    }
    runnerState.env.deferredEvents = remainingEvents;
    for (const event of dueEvents.slice(0, eventsToProcess)) {
      event.execute(runnerState.env);
      if (spendWork(1)) {
        finishCombatRunaway();
        return;
      }
    }

    // 2. Charge units and process effects (these log _cast and schedule _hit)
    const unitsReadyToAct = chargeUnits(
      nextState,
      delta,
      runnerState.env.logger,
    );

    for (const unit of unitsReadyToAct) {
      CombatStatsTracker.trackAction(
        runnerState.env.combatStates.combatStatsTrackerState,
        {
          unit,
        },
      );
      TriggerSystem.processEffectsIO(env, unit, unit.effects, false);
      if (spendWork(1)) {
        finishCombatRunaway();
        return;
      }
    }

    // 3. Status effects tick (poison/regen)
    statusEffectSystemState = StatusEffectSystem.update(
      env,
      statusEffectSystemState,
      delta,
    );

    // 3.5. Check threshold reactions (every_100_damage, every_10_poison, etc.)
    //      The per-frame cap spreads a gigantic stat burst (e.g. one regen
    //      application worth thousands of crossings) across frames instead of
    //      firing them all in this one — see getCrossedThresholds' maxResults.
    const crossed = CombatStatsTracker.getCrossedThresholds(
      runnerState.env.combatStates.combatStatsTrackerState,
      thresholdState,
      MAX_THRESHOLD_CROSSINGS_PER_FRAME,
    );
    for (const { forceId, reactionId } of crossed) {
      const triggerer = nextState.units.find((u) => u.force === forceId);
      if (triggerer) {
        // reactionId is always one of the threshold/global Effect ids (see
        // STAT_CONFIGS in CombatStatsTracker) — the cast narrows EffectId to Effect.
        TriggerSystem.processReactions(
          env,
          triggerer,
          { id: reactionId } as Effect,
          1,
        );
      }
      if (spendWork(1)) {
        finishCombatRunaway();
        return;
      }
    }

    // 4. Timeout damage (storm)
    timeoutSystemState = Timeout.updateTimeoutDamageSystem(
      env,
      timeoutSystemState,
      delta,
    );

    // 5. Check combat outcome after status effects and timeout damage
    const tickOutcome = checkCombatOutcome(nextState);
    if (tickOutcome) {
      finishCombat(tickOutcome);
      return;
    }
  };

  const finishCombat = (outcome: "player_won" | "player_lost" | "both_won") => {
    if (!runnerState.active) return;

    runnerState.active = false;

    // Persist combat stats into the session runStats after combat ends.
    CombatStatsTracker.stop(
      runnerState.env.combatStates.combatStatsTrackerState,
      session,
    );

    timeoutSystemState = Timeout.stopTimeoutDamageSystem(timeoutSystemState);
    timeoutSystemState = Timeout.onTimeoutDamageCombatEnd(timeoutSystemState);

    // Log combat stats before outcome
    if (runnerState.env.combatStates?.combatStatsTrackerState) {
      const { unitStats, currentCombatStats } =
        runnerState.env.combatStates.combatStatsTrackerState;
      runnerState.env.logger.log({
        type: "combat_stats",
        unitStats: Array.from(unitStats.entries()),
        currentCombatStats: Array.from(currentCombatStats.entries()),
      });
    }

    // Log outcome — use current time so sorting keeps it last
    const currentTime = runnerState.env.logger.getCurrentTimeMs();
    runnerState.env.logger.log(
      {
        type: "outcome",
        result: outcome,
      },
      currentTime,
    );
  };

  return {
    updateFrame,
    finishCombat,
    isActive: () => runnerState.active,
    stop: () => {
      runnerState.active = false;
    },
    getEnv: () => runnerState.env,
  };
};

export const chargeUnits = (
  state: CombatState,
  delta: number,
  logger: CombatLogger.CombatLogger,
): Unit[] => {
  const performingUnits: Unit[] = [];

  for (const unit of state.units) {
    const wasHasted = unit.hasted > 0;
    const wasSlowed = unit.slowed > 0;
    const wasSilenced = unit.silenced > 0;

    const cooldownMultiplier =
      wasHasted && wasSlowed ? 1 : wasHasted ? 0.5 : wasSlowed ? 2 : 1;

    const chargeRate = 1 / cooldownMultiplier;

    unit.charge += delta * chargeRate;

    if (wasHasted) {
      unit.hasted = Math.max(0, unit.hasted - delta);

      if (unit.hasted === 0) {
        logger.log({ type: "haste_end", unitId: unit.id });
      }
    }

    if (wasSlowed) {
      unit.slowed = Math.max(0, unit.slowed - delta);

      if (unit.slowed === 0) {
        logger.log({ type: "slow_end", unitId: unit.id });
      }
    }

    if (wasSilenced) {
      unit.silenced = Math.max(0, unit.silenced - delta);

      if (unit.silenced === 0) {
        logger.log({ type: "silence_end", unitId: unit.id });
      }
    }

    unit.refresh = Math.max(0, unit.refresh - delta);

    if (unit.charge >= unit.cooldown && unit.refresh === 0) {
      if (unit.silenced > 0) {
        // D1 (docs/wacky-content-plan.md): a silenced unit wastes its turn
        // instead of casting — charge resets so it re-charges from zero.
        unit.charge = 0;
        unit.refresh = Constants.MIN_REFRESH_MS;
        logger.log({ type: "silence_skip", unitId: unit.id });
      } else {
        unit.charge = unit.charge - unit.cooldown;
        unit.refresh = Constants.MIN_REFRESH_MS;
        performingUnits.push(unit);
      }
    }
  }

  return performingUnits;
};
