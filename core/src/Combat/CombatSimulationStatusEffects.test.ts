/**
 * CombatSimulation integration tests for status-effect log generation:
 * poison/regen casts, hits, ticks, and haste/slow expiry logs.
 * Split out of CombatSimulation.test.ts — shares the same harness.
 */
/// <reference types="jest" />

import * as Card from "../Entities/Card";
import * as Constants from "../Constants";
import * as CombatSimulation from "./CombatSimulation";
import * as CombatRunner from "./CombatRunner";
import {
  createCustomCombat,
  simulateCombatForFrames,
} from "../__test_utils__/combatSimulationHarness";

afterAll(() => {
  Card.resetCardsMap();
});

describe("Poison and Regen log entries", () => {
  it("poison_cast and poison_hit are logged when a poison unit acts", () => {
    const poisonUnit = Card.makeUnit(
      Constants.FORCE_ID_PLAYER,
      "plague_incubator",
      [1, 0],
    );
    poisonUnit.cooldown = 100;

    const { session, enemyTeam } = createCustomCombat(
      [poisonUnit],
      5000,
      1,
      "test-poison-001",
    );
    const logs = simulateCombatForFrames(session, enemyTeam, 50);

    const casts = logs.filter((l) => l.type === "poison_cast");
    const hits = logs.filter((l) => l.type === "poison_hit");

    expect(casts.length).toBeGreaterThan(0);
    expect(hits.length).toBeGreaterThan(0);

    for (const cast of casts) {
      expect(cast.travelTime).toBe(200);
      expect(typeof cast.amount).toBe("number");
    }
    for (const hit of hits) {
      expect(typeof hit.newPoison).toBe("number");
      expect(hit.poisonDelta).toBeDefined();
      expect(typeof hit.poisonDelta).toBe("number");
      expect(hit.poisonDelta).toBeGreaterThan(0);
    }
  });

  it("regen_cast and regen_hit are logged when a regen unit acts", () => {
    const regenUnit = Card.makeUnit(
      Constants.FORCE_ID_PLAYER,
      "life_weaver",
      [1, 0],
    );
    regenUnit.cooldown = 100;

    const { session, enemyTeam } = createCustomCombat(
      [regenUnit],
      5000,
      1,
      "test-regen-001",
    );
    const logs = simulateCombatForFrames(session, enemyTeam, 50);

    const casts = logs.filter((l) => l.type === "regen_cast");
    const hits = logs.filter((l) => l.type === "regen_hit");

    expect(casts.length).toBeGreaterThan(0);
    expect(hits.length).toBeGreaterThan(0);

    for (const hit of hits) {
      expect(typeof hit.newRegen).toBe("number");
      expect(hit.regenDelta).toBeDefined();
      expect(typeof hit.regenDelta).toBe("number");
      expect(hit.regenDelta).toBeGreaterThan(0);
    }
  });

  it("poison_tick entries appear at ~1s intervals after poison is applied", () => {
    const poisonUnit = Card.makeUnit(
      Constants.FORCE_ID_PLAYER,
      "plague_incubator",
      [1, 0],
    );
    poisonUnit.cooldown = 100;

    const { session, enemyTeam } = createCustomCombat(
      [poisonUnit],
      5000,
      1,
      "test-poison-tick-001",
    );
    const logs = simulateCombatForFrames(session, enemyTeam, 150);

    const ticks = logs.filter((l) => l.type === "poison_tick");
    expect(ticks.length).toBeGreaterThan(0);

    for (const tick of ticks) {
      expect(tick.force).toBeDefined();
      expect(typeof tick.amount).toBe("number");
      expect(tick.amount).toBeGreaterThan(0);
      expect(typeof tick.newLife).toBe("number");
    }

    if (ticks.length >= 2) {
      const interval = ticks[1].timeMs - ticks[0].timeMs;
      expect(interval).toBeGreaterThanOrEqual(900);
      expect(interval).toBeLessThanOrEqual(1100);
    }
  });

  it("regen_tick entries appear at ~1s intervals after regen is applied", () => {
    const regenUnit = Card.makeUnit(
      Constants.FORCE_ID_PLAYER,
      "life_weaver",
      [1, 0],
    );
    regenUnit.cooldown = 100;

    const { session, enemyTeam } = createCustomCombat(
      [regenUnit],
      5000,
      1,
      "test-regen-tick-001",
    );
    const logs = simulateCombatForFrames(session, enemyTeam, 150);

    const ticks = logs.filter((l) => l.type === "regen_tick");
    expect(ticks.length).toBeGreaterThan(0);

    for (const tick of ticks) {
      expect(tick.force).toBeDefined();
      expect(typeof tick.amount).toBe("number");
      expect(tick.amount).toBeGreaterThan(0);
      expect(typeof tick.newLife).toBe("number");
    }

    if (ticks.length >= 2) {
      const interval = ticks[1].timeMs - ticks[0].timeMs;
      expect(interval).toBeGreaterThanOrEqual(900);
      expect(interval).toBeLessThanOrEqual(1100);
    }
  });

  it("poison_hit arrives exactly 200ms after poison_cast (travelTime respected)", () => {
    const poisonUnit = Card.makeUnit(
      Constants.FORCE_ID_PLAYER,
      "plague_incubator",
      [1, 0],
    );
    poisonUnit.cooldown = 100;

    const { session, enemyTeam } = createCustomCombat(
      [poisonUnit],
      5000,
      1,
      "test-poison-travel-001",
    );
    const logs = simulateCombatForFrames(session, enemyTeam, 50);

    const casts = logs.filter((l) => l.type === "poison_cast");
    const hits = logs.filter((l) => l.type === "poison_hit");

    for (const cast of casts) {
      const match = hits.find(
        (h) =>
          h.sourceId === cast.sourceId &&
          h.amount === cast.amount &&
          h.timeMs > cast.timeMs,
      );
      if (match) {
        const delay = match.timeMs - cast.timeMs;
        expect(delay).toBeGreaterThanOrEqual(180);
        expect(delay).toBeLessThanOrEqual(220);
      }
    }
  });

  it("newLife field tracks poison tick damage correctly", () => {
    const poisonUnit = Card.makeUnit(
      Constants.FORCE_ID_PLAYER,
      "plague_incubator",
      [1, 0],
    );
    poisonUnit.cooldown = 100;

    const { session, enemyTeam } = createCustomCombat(
      [poisonUnit],
      5000,
      1,
      "test-poison-life-001",
    );
    const logs = simulateCombatForFrames(session, enemyTeam, 200);

    const ticks = logs.filter((l) => l.type === "poison_tick");
    if (ticks.length >= 2) {
      expect(ticks[1].newLife!).toBeLessThan(ticks[0].newLife!);
    }
  });
});

describe("Haste / Slow status effect log generation", () => {
  it("generates haste_end log when haste duration expires", () => {
    const { session, enemyTeam } = createCustomCombat(
      [],
      5000,
      1,
      "test-haste-end-001",
    );

    const combatState = CombatSimulation.createCombatState(session, enemyTeam);

    const combatRunner = CombatRunner.runCombat(session, combatState);
    const env = combatRunner.getEnv();

    const playerCore = combatState.units.find(
      (u) => u.force === Constants.FORCE_ID_PLAYER && u.isCore,
    )!;
    playerCore.hasted = 50;

    let frame = 0;
    const SIM_DELTA = 16.67;
    while (combatRunner.isActive() && frame < 20) {
      combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
      frame++;
    }
    const allLogs = env.logger.getLogs();

    const hasteEndLogs = allLogs.filter((l) => l.type === "haste_end");
    expect(hasteEndLogs.length).toBe(1);
    expect(hasteEndLogs[0].unitId).toBe(playerCore.id);
    expect(playerCore.hasted).toBeLessThanOrEqual(0);
  });

  it("generates slow_end log when slow duration expires", () => {
    const { session, enemyTeam } = createCustomCombat(
      [],
      5000,
      1,
      "test-slow-end-001",
    );

    const combatState = CombatSimulation.createCombatState(session, enemyTeam);

    const combatRunner = CombatRunner.runCombat(session, combatState);
    const env = combatRunner.getEnv();

    const cpuCore = combatState.units.find(
      (u) => u.force === Constants.FORCE_ID_CPU && u.isCore,
    )!;
    cpuCore.slowed = 50;

    let frame = 0;
    const SIM_DELTA = 16.67;
    while (combatRunner.isActive() && frame < 20) {
      combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
      frame++;
    }
    const allLogs = env.logger.getLogs();

    const slowEndLogs = allLogs.filter((l) => l.type === "slow_end");
    expect(slowEndLogs.length).toBe(1);
    expect(slowEndLogs[0].unitId).toBe(cpuCore.id);
    expect(cpuCore.slowed).toBeLessThanOrEqual(0);
  });

  it("generates both haste_end and slow_end when unit has both and they expire", () => {
    const { session, enemyTeam } = createCustomCombat(
      [],
      5000,
      1,
      "test-both-end-001",
    );

    const combatState = CombatSimulation.createCombatState(session, enemyTeam);

    const combatRunner = CombatRunner.runCombat(session, combatState);
    const env = combatRunner.getEnv();

    const playerCore = combatState.units.find(
      (u) => u.force === Constants.FORCE_ID_PLAYER && u.isCore,
    )!;
    playerCore.hasted = 1500;
    playerCore.slowed = 1000;
    playerCore.charge = 0;

    let frame = 0;
    const SIM_DELTA = 16.67;
    while (combatRunner.isActive() && frame < 120) {
      combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
      frame++;
    }
    const allLogs = env.logger.getLogs();

    const hasteEndLogs = allLogs.filter((l) => l.type === "haste_end");
    const slowEndLogs = allLogs.filter((l) => l.type === "slow_end");

    expect(slowEndLogs.length).toBe(1);
    expect(hasteEndLogs.length).toBe(1);
    expect(slowEndLogs[0].timeMs).toBeLessThan(hasteEndLogs[0].timeMs);
    expect(playerCore.hasted).toBeLessThanOrEqual(0);
    expect(playerCore.slowed).toBeLessThanOrEqual(0);
  });

  it("cooldown multiplier is 1 when both hasted and slowed are active", () => {
    const { session, enemyTeam } = createCustomCombat(
      [],
      5000,
      1,
      "test-both-multiplier-001",
    );

    const combatState = CombatSimulation.createCombatState(session, enemyTeam);

    const combatRunner = CombatRunner.runCombat(session, combatState);
    const env = combatRunner.getEnv();

    const playerCore = combatState.units.find(
      (u) => u.force === Constants.FORCE_ID_PLAYER && u.isCore,
    )!;
    playerCore.hasted = 500;
    playerCore.slowed = 500;
    playerCore.charge = 0;
    playerCore.cooldown = 10000;
    playerCore.refresh = 0;

    const SIM_DELTA = 16.67;
    combatRunner.updateFrame(combatState, 0, SIM_DELTA);

    expect(playerCore.charge).toBeCloseTo(SIM_DELTA, 0);
    expect(playerCore.hasted).toBeGreaterThan(0);
    expect(playerCore.slowed).toBeGreaterThan(0);

    const allLogs = env.logger.getLogs();
    const endLogs = allLogs.filter(
      (l) => l.type === "haste_end" || l.type === "slow_end",
    );
    expect(endLogs.length).toBe(0);
  });

  it("no haste_end or slow_end logs when status never applied", () => {
    const { session, enemyTeam } = createCustomCombat(
      [],
      5000,
      1,
      "test-never-applied-001",
    );

    const combatState = CombatSimulation.createCombatState(session, enemyTeam);

    const combatRunner = CombatRunner.runCombat(session, combatState);
    const env = combatRunner.getEnv();

    let frame = 0;
    const SIM_DELTA = 16.67;
    while (combatRunner.isActive() && frame < 30) {
      combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
      frame++;
    }
    const allLogs = env.logger.getLogs();

    const hasteEndLogs = allLogs.filter((l) => l.type === "haste_end");
    const slowEndLogs = allLogs.filter((l) => l.type === "slow_end");
    expect(hasteEndLogs.length).toBe(0);
    expect(slowEndLogs.length).toBe(0);
  });
});
