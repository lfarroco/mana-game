/**
 * Shared combat test harness.
 * Provides unit factories, combat setup, frame runner, and type-safe log helpers
 * used across EffectIntegration, ReactionIntegration, and CombatSimulation tests.
 */
/// <reference types="jest" />

import * as Models from "../Models";
import * as Card from "../Entities/Card";
import * as Constants from "../Constants";
import * as CombatSimulation from "../Combat/CombatSimulation";
import * as RunCombatCore from "../Combat/CombatRunner";
import * as BoardLogic from "../BoardLogic";
import * as F from "../Functional";
import * as CombatLogger from "../Combat/CombatLogger";
import { BASE_COLLECTION_DATA } from "../BaseCollection";

// ---------------------------------------------------------------------------
// Card registry setup (call once per test file)
// ---------------------------------------------------------------------------

export function registerBaseCollection(): void {
  Card.registerCollection(BASE_COLLECTION_DATA);
}

export function resetCardRegistry(): void {
  Card.resetRegistry();
}

// ---------------------------------------------------------------------------
// Unit factory
// ---------------------------------------------------------------------------

export function makeTestUnit(overrides: {
  effects: Models.Effect[];
  reactions?: Models.EffectReaction[];
  power?: number;
  cooldown?: number;
  position?: [number, number];
  isCore?: boolean;
  life?: number;
  critical?: number;
}): Models.Unit {
  return {
    id: "",
    cardId: "test-custom-unit",
    pic: "test",
    force: Constants.FORCE_ID_PLAYER,
    position: overrides.position ?? [0, 0],
    rank: 1,
    power: overrides.power ?? 10,
    bonusPower: 0,
    critical: overrides.critical ?? 0,
    life: overrides.life ?? 100,
    maxLife: overrides.life ?? 100,
    shield: 0,
    cooldown: overrides.cooldown ?? 1000,
    evade: 0,
    effects: overrides.effects,
    reactions: overrides.reactions ?? [],
    charge: 0,
    refresh: 0,
    hasted: 0,
    slowed: 0,
    isCore: overrides.isCore ?? false,
  };
}

// ---------------------------------------------------------------------------
// Combat setup
// ---------------------------------------------------------------------------

export type CombatHarness = {
  session: Models.SessionData;
  combatState: Models.CombatState;
  combatRunner: ReturnType<typeof RunCombatCore.runCombat>;
  env: Models.CombatEnvironment;
};

export function setupCombat(
  playerUnits: Models.Unit[],
  cpuCoreLife: number = 5000,
  seed: string = "test-seed",
): CombatHarness {
  playerUnits.forEach((u) => {
    u.force = Constants.FORCE_ID_PLAYER;
    u.charge = 0;
    u.refresh = 0;
  });

  const hasPlayerCore = playerUnits.some((u) => u.isCore);
  if (!hasPlayerCore) {
    const freeSlot = BoardLogic.findFreeSlot(
      playerUnits,
      Constants.FORCE_ID_PLAYER,
      [1, 1],
    );
    const core = Card.makeUnit(
      Constants.FORCE_ID_PLAYER,
      "critical_crystal",
      F.getOrElse(freeSlot, [1, 1]),
    );
    core.power = 1;
    core.cooldown = 99999;
    playerUnits.push(core);
  } else {
    const pc = playerUnits.find((u) => u.isCore)!;
    pc.cooldown = 99999;
    pc.charge = 0;
  }

  const cpuCore = Card.makeUnit(
    Constants.FORCE_ID_CPU,
    "critical_crystal",
    [0, 2],
  );
  cpuCore.life = cpuCoreLife;
  cpuCore.maxLife = cpuCoreLife;
  cpuCore.power = 1;
  cpuCore.cooldown = 99999;
  cpuCore.charge = 0;
  cpuCore.refresh = 0;

  const session: Models.SessionData = {
    id: "test-session",
    player_id: "test-player",
    phase: "combat",
    session_type: { type: "singleplayer" },
    round: 1,
    step: 0,
    seed,
    initial_seed: seed,
    options: [],
    team: { units: playerUnits },
    wins: 0,
    losses: 0,
    action_log: [],
    encounter_history: [],
  };

  const combatState = CombatSimulation.createCombatState(session, [cpuCore]);
  const combatRunner = RunCombatCore.runCombat(session, combatState);

  return { session, combatState, combatRunner, env: combatRunner.getEnv() };
}

// ---------------------------------------------------------------------------
// Frame runner
// ---------------------------------------------------------------------------

export const SIM_DELTA = 16.67;

export function runFrames(
  combatRunner: ReturnType<typeof RunCombatCore.runCombat>,
  combatState: Models.CombatState,
  maxFrames: number,
): CombatLogger.CombatLogEntry[] {
  let frame = 0;
  while (combatRunner.isActive() && frame < maxFrames) {
    combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
    frame++;
  }
  return combatRunner.getEnv().logger.getLogs();
}

/**
 * Run frames until a condition on the combat logs is met (or combat ends /
 * maxFrames is reached). Prefer this over frame-count arithmetic: tests
 * should express intent ("until 200 damage dealt") rather than depending on
 * exact cooldown timing.
 *
 * @example
 *   const logs = runUntil(combatRunner, combatState, (logs) =>
 *     filterLogs(logs, "damage_hit").reduce((s, h) => s + h.amount, 0) >= 200,
 *   );
 */
export function runUntil(
  combatRunner: ReturnType<typeof RunCombatCore.runCombat>,
  combatState: Models.CombatState,
  predicate: (logs: CombatLogger.CombatLogEntry[]) => boolean,
  maxFrames: number = 10000,
): CombatLogger.CombatLogEntry[] {
  const logs = combatRunner.getEnv().logger.getLogs();
  let frame = 0;
  while (combatRunner.isActive() && frame < maxFrames && !predicate(logs)) {
    combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
    frame++;
  }
  return logs;
}

// ---------------------------------------------------------------------------
// Type-safe log filtering
// ---------------------------------------------------------------------------

/**
 * Filter combat logs by type with full type narrowing.
 *
 * @example
 *   const damageHits = filterLogs(logs, "damage_hit");
 *   // damageHits is DamageHitEntry[], no manual narrowing needed
 *   expect(damageHits[0].amount).toBe(25);
 */
export function filterLogs<T extends CombatLogger.CombatLogEntry["type"]>(
  logs: CombatLogger.CombatLogEntry[],
  type: T,
): Array<Extract<CombatLogger.CombatLogEntry, { type: T }>> {
  return logs.filter(
    (l): l is Extract<CombatLogger.CombatLogEntry, { type: T }> => l.type === type,
  );
}
