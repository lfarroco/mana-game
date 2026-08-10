/**
 * Tick cadence — integration tests pinning that the combat loop's periodic
 * systems (timeout damage, poison, regen) fire exactly once per 1000ms of
 * simulated combat time.
 *
 * Regression guard: if any of these systems started ticking several times per
 * second (e.g. a missing ms accumulator), the intervals below would shrink to
 * ~250ms and these tests would fail.
 */
/// <reference types="jest" />

import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  setupCombat,
  runFrames,
  filterLogs,
} from "../__test_utils__/combatHarness";
import * as Poison from "./PoisonDamageSystem";
import * as Regen from "./RegenSystem";
import * as Constants from "../Constants";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

const SIM_DELTA = 16.67;

/** Assert consecutive timestamps are ~1000ms apart (i.e. 1 tick per second). */
const assertSecondCadence = (timeMs: number[]): void => {
  for (let i = 1; i < timeMs.length; i++) {
    const interval = timeMs[i] - timeMs[i - 1];
    expect(interval).toBeGreaterThanOrEqual(950);
    expect(interval).toBeLessThanOrEqual(1050);
  }
};

describe("combat tick cadence — 1 tick per second", () => {
  it("timeout damage fires once per 1000ms after the storm starts", () => {
    const playerUnits = [
      makeTestUnit({ effects: [], isCore: true, life: 999_999 }),
    ];
    const { combatState, combatRunner } = setupCombat(
      playerUnits,
      999_999,
      "cadence-timeout",
    );

    // 30s pre-storm + 4s of storm: first tick fires on the storm-start frame,
    // then one per 1000ms → 5 ticks per force.
    runFrames(combatRunner, combatState, Math.ceil(34_000 / SIM_DELTA));

    const logs = combatRunner.getEnv().logger.getLogs();
    const playerCasts = filterLogs(logs, "timeout_damage_cast").filter(
      (l) => l.force === Constants.FORCE_ID_PLAYER,
    );
    const cpuCasts = filterLogs(logs, "timeout_damage_cast").filter(
      (l) => l.force === Constants.FORCE_ID_CPU,
    );

    expect(playerCasts).toHaveLength(5);
    expect(cpuCasts).toHaveLength(5);
    assertSecondCadence(playerCasts.map((l) => l.timeMs));

    // storm_start precedes the first cast.
    const stormIndex = logs.findIndex((l) => l.type === "storm_start");
    const firstCastIndex = logs.findIndex(
      (l) => l.type === "timeout_damage_cast",
    );
    expect(stormIndex).toBeGreaterThanOrEqual(0);
    expect(firstCastIndex).toBeGreaterThan(stormIndex);
  });

  it("poison and regen tick once per 1000ms", () => {
    const playerUnits = [
      makeTestUnit({ effects: [], isCore: true, life: 999_999 }),
    ];
    const { combatState, combatRunner, env } = setupCombat(
      playerUnits,
      999_999,
      "cadence-status",
    );

    env.combatStates.poisonSystemState = Poison.applyPoison(
      env.combatStates.poisonSystemState,
      Constants.FORCE_ID_PLAYER,
      50,
    );
    env.combatStates.poisonSystemState = Poison.applyPoison(
      env.combatStates.poisonSystemState,
      Constants.FORCE_ID_CPU,
      50,
    );
    env.combatStates.regenSystemState = Regen.applyRegen(
      env.combatStates.regenSystemState,
      Constants.FORCE_ID_PLAYER,
      20,
    );
    env.combatStates.regenSystemState = Regen.applyRegen(
      env.combatStates.regenSystemState,
      Constants.FORCE_ID_CPU,
      20,
    );

    runFrames(combatRunner, combatState, Math.ceil(5000 / SIM_DELTA));

    const logs = combatRunner.getEnv().logger.getLogs();
    const playerPoison = filterLogs(logs, "poison_tick").filter(
      (l) => l.force === Constants.FORCE_ID_PLAYER,
    );
    const playerRegen = filterLogs(logs, "regen_tick").filter(
      (l) => l.force === Constants.FORCE_ID_PLAYER,
    );

    expect(playerPoison).toHaveLength(5);
    expect(playerRegen).toHaveLength(5);
    assertSecondCadence(playerPoison.map((l) => l.timeMs));
    assertSecondCadence(playerRegen.map((l) => l.timeMs));
  });
});
