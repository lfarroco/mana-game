/// <reference types="jest" />

import * as StatusEffectSystem from "../Combat/StatusEffectSystem";
import * as Poison from "../Combat/PoisonDamageSystem";
import * as Regen from "../Combat/RegenSystem";
import * as CombatLogger from "../Combat/CombatLogger";
import * as Constants from "../Constants";
import * as Models from "../Models";
import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  setupCombat,
} from "../__test_utils__/combatHarness";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

describe("StatusEffectSystem — tick cadence", () => {
  const FRAME_DELTA = 16.67;
  type PoisonTickLog = Extract<
    CombatLogger.CombatLogEntry,
    { type: "poison_tick" }
  >;
  type RegenTickLog = Extract<
    CombatLogger.CombatLogEntry,
    { type: "regen_tick" }
  >;

  const createEnvWithRates = (poisonRate: number, regenRate: number) => {
    const playerUnits = [
      makeTestUnit({ effects: [], isCore: true, life: 10_000 }),
    ];
    const { combatState, env } = setupCombat(
      playerUnits,
      10_000,
      "status-cadence",
    );

    env.combatStates.poisonSystemState = Poison.applyPoison(
      env.combatStates.poisonSystemState,
      Constants.FORCE_ID_PLAYER,
      poisonRate,
    );
    env.combatStates.poisonSystemState = Poison.applyPoison(
      env.combatStates.poisonSystemState,
      Constants.FORCE_ID_CPU,
      poisonRate,
    );
    env.combatStates.regenSystemState = Regen.applyRegen(
      env.combatStates.regenSystemState,
      Constants.FORCE_ID_PLAYER,
      regenRate,
    );
    env.combatStates.regenSystemState = Regen.applyRegen(
      env.combatStates.regenSystemState,
      Constants.FORCE_ID_CPU,
      regenRate,
    );

    return { combatState, env };
  };

  const advance = (
    env: Models.CombatEnvironment,
    state: StatusEffectSystem.StatusEffectSystemState,
    totalMs: number,
  ): StatusEffectSystem.StatusEffectSystemState => {
    let next = state;
    let elapsed = 0;
    while (elapsed < totalMs) {
      elapsed += FRAME_DELTA;
      env.logger.setCurrentTimeMs(elapsed);
      next = StatusEffectSystem.update(env, next, FRAME_DELTA);
    }
    return next;
  };

  const intervals = (ticks: { timeMs: number }[]): number[] =>
    ticks.slice(1).map((tick, i) => tick.timeMs - ticks[i].timeMs);

  it("does not tick before 1000ms of combat time have elapsed", () => {
    const { env } = createEnvWithRates(50, 20);
    let state = StatusEffectSystem.initialize(env.combatState);

    state = advance(env, state, 950);

    const logs = env.logger.getLogs();
    expect(logs.filter((l) => l.type === "poison_tick")).toHaveLength(0);
    expect(logs.filter((l) => l.type === "regen_tick")).toHaveLength(0);
    expect(state.elapsed).toBeGreaterThan(0);
  });

  it("ticks poison and regen exactly once per 1000ms for both forces", () => {
    const { env } = createEnvWithRates(50, 20);
    let state = StatusEffectSystem.initialize(env.combatState);

    state = advance(env, state, 5000);

    const logs = env.logger.getLogs();
    const playerPoison = logs.filter(
      (l): l is PoisonTickLog =>
        l.type === "poison_tick" && l.force === Constants.FORCE_ID_PLAYER,
    );
    const playerRegen = logs.filter(
      (l): l is RegenTickLog =>
        l.type === "regen_tick" && l.force === Constants.FORCE_ID_PLAYER,
    );

    expect(playerPoison).toHaveLength(5);
    expect(playerRegen).toHaveLength(5);
    expect(
      logs.filter(
        (l) => l.type === "poison_tick" && l.force === Constants.FORCE_ID_CPU,
      ),
    ).toHaveLength(5);
    expect(
      logs.filter(
        (l) => l.type === "regen_tick" && l.force === Constants.FORCE_ID_CPU,
      ),
    ).toHaveLength(5);

    for (const interval of intervals(playerPoison)) {
      expect(interval).toBeGreaterThanOrEqual(950);
      expect(interval).toBeLessThanOrEqual(1050);
    }
    for (const interval of intervals(playerRegen)) {
      expect(interval).toBeGreaterThanOrEqual(950);
      expect(interval).toBeLessThanOrEqual(1050);
    }
  });

  it("applies poison before regen within a tick and accounts the net life", () => {
    const { env, combatState } = createEnvWithRates(50, 20);
    let state = StatusEffectSystem.initialize(env.combatState);

    state = advance(env, state, 1100);

    const logs = env.logger.getLogs();
    const playerPoison = logs.find(
      (l): l is PoisonTickLog =>
        l.type === "poison_tick" && l.force === Constants.FORCE_ID_PLAYER,
    );
    const playerRegen = logs.find(
      (l): l is RegenTickLog =>
        l.type === "regen_tick" && l.force === Constants.FORCE_ID_PLAYER,
    );

    expect(playerPoison).toBeDefined();
    expect(playerRegen).toBeDefined();
    expect(playerPoison!.lifeDelta).toBe(-50);
    expect(playerRegen!.lifeDelta).toBe(20);

    const core = combatState.units.find(
      (u) => u.force === Constants.FORCE_ID_PLAYER && u.isCore,
    )!;
    expect(core.life).toBe(10_000 - 50 + 20);
  });
});
