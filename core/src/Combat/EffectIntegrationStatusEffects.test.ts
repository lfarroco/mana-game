/**
 * Integration tests for the status-changing effects in the combat simulation:
 * haste, slow, and charge. Split out of EffectIntegration.test.ts.
 */
/// <reference types="jest" />

import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  setupCombat,
  runFrames,
} from "../__test_utils__/combatHarness";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

describe("Effect integration — haste", () => {
  it("produces haste_cast and haste_hit logs with duration 2000", () => {
    const unit = makeTestUnit({
      effects: [{ id: "haste", duration: 2000, targets: { id: "self" } }],
      cooldown: 500,
    });
    unit.id = "haste-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const castLogs = logs.filter((l) => l.type === "haste_cast");
    const hitLogs = logs.filter((l) => l.type === "haste_hit");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    expect(castLogs[0].effectDuration).toBe(2000);
    expect(hitLogs.length).toBeGreaterThanOrEqual(1);
    expect(hitLogs[0].effectDuration).toBe(2000);
  });

  it("doubles charge rate while hasted", () => {
    const unit = makeTestUnit({
      effects: [{ id: "haste", duration: 2000, targets: { id: "self" } }],
      cooldown: 500,
    });
    unit.id = "haste-charge-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    // Find the cloned unit in combat state and apply haste
    const simDelta = 16.67;
    const csUnit = combatState.unitById.get("haste-charge-unit")!;
    csUnit.hasted = 2000;
    csUnit.charge = 0;
    csUnit.refresh = 0;

    combatRunner.updateFrame(combatState, 0, simDelta);

    expect(csUnit.charge).toBeCloseTo(simDelta * 2, 0);
  });
});

describe("Effect integration — slow", () => {
  it("produces slow_cast log with duration 2000", () => {
    const unit = makeTestUnit({
      effects: [
        {
          id: "slow",
          duration: 2000,
          targets: { id: "random_enemy", count: 1 },
        },
      ],
      cooldown: 500,
    });
    unit.id = "slow-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const castLogs = logs.filter((l) => l.type === "slow_cast");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    expect(castLogs[0].effectDuration).toBe(2000);
  });

  it("halves charge rate while slowed", () => {
    const unit = makeTestUnit({
      effects: [
        {
          id: "slow",
          duration: 2000,
          targets: { id: "random_enemy", count: 1 },
        },
      ],
      cooldown: 500,
    });
    unit.id = "slow-charge-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const simDelta = 16.67;
    const csCpuCore = combatState.cpuCore;
    csCpuCore.slowed = 2000;
    csCpuCore.charge = 0;
    csCpuCore.refresh = 0;

    combatRunner.updateFrame(combatState, 0, simDelta);

    expect(csCpuCore.charge).toBeCloseTo(simDelta * 0.5, 0);
  });
});

describe("Effect integration — charge", () => {
  it("produces charge_cast and charge_hit logs with amount 300", () => {
    const unit = makeTestUnit({
      effects: [
        {
          id: "charge",
          duration: 300,
          targets: { id: "random_ally", count: 1 },
        },
      ],
      cooldown: 500,
    });
    unit.id = "charge-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const castLogs = logs.filter((l) => l.type === "charge_cast");
    const hitLogs = logs.filter((l) => l.type === "charge_hit");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    expect(castLogs[0].amount).toBe(300);
    expect(hitLogs.length).toBeGreaterThanOrEqual(1);
    expect(hitLogs[0].amount).toBe(300);
  });
});
