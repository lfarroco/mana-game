/**
 * Integration tests for power-scaling effects in the combat simulation:
 * increase_power, decrease_power, increase_critical, and multiply_power.
 * Split out of EffectIntegration.test.ts.
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

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

describe("Effect integration — increase_power", () => {
  it("logs increase_power and raises the unit's power", () => {
    const initialPower = 20;
    const unit = makeTestUnit({
      effects: [
        {
          id: "increase_power",
          amount: 10,
          permanent: false,
          targets: { id: "self" },
        },
      ],
      power: initialPower,
      cooldown: 500,
    });
    unit.id = "inc-power-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const incLogs = logs.filter((l) => l.type === "increase_power");
    expect(incLogs.length).toBeGreaterThanOrEqual(1);
    expect(incLogs[0].amount).toBe(10);
    const csUnit = combatState.unitById.get("inc-power-unit")!;
    expect(csUnit.power).toBeGreaterThan(initialPower);
  });
});

describe("Effect integration — decrease_power", () => {
  it("logs decrease_power and lowers the target's power", () => {
    const unit = makeTestUnit({
      effects: [
        {
          id: "decrease_power",
          amount: 8,
          permanent: false,
          targets: { id: "random_enemy", count: 1 },
        },
      ],
      cooldown: 500,
    });
    unit.id = "dec-power-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const cpuCore = combatState.cpuCore;
    // Non-overkill target so the logged amount equals the configured one.
    cpuCore.power = 50;
    const initialCpuPower = cpuCore.power;

    const logs = runFrames(combatRunner, combatState, 200);

    const decLogs = logs.filter((l) => l.type === "decrease_power");
    expect(decLogs.length).toBeGreaterThanOrEqual(1);
    expect(decLogs[0].amount).toBe(8);
    const csCpuCore = combatState.cpuCore;
    expect(csCpuCore.power).toBeLessThan(initialCpuPower);
  });

  it("logs the applied magnitude on overkill (power clamps at 0)", () => {
    // The harness cpu core has 1 power: a decrease of 8 applies 1. Logging
    // the requested 8 would replay -7 on the client (negative-power desync).
    const unit = makeTestUnit({
      effects: [
        {
          id: "decrease_power",
          amount: 8,
          permanent: false,
          targets: { id: "random_enemy", count: 1 },
        },
      ],
      cooldown: 500,
    });
    unit.id = "dec-overkill-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const decLogs = logs.filter((l) => l.type === "decrease_power");
    expect(decLogs.length).toBeGreaterThanOrEqual(1);
    expect(decLogs[0].amount).toBe(1);
    expect(combatState.cpuCore.power).toBe(0);
  });
});

describe("Effect integration — increase_critical", () => {
  it("logs increase_critical multiple times and raises unit critical", () => {
    const unit = makeTestUnit({
      effects: [
        {
          id: "increase_critical",
          amount: 10,
          permanent: false,
          targets: { id: "self" },
        },
      ],
      cooldown: 500,
    });
    unit.id = "inc-crit-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const critLogs = logs.filter((l) => l.type === "increase_critical");
    expect(critLogs.length).toBeGreaterThanOrEqual(2);
    const csUnit = combatState.unitById.get("inc-crit-unit")!;
    expect(csUnit.critical).toBeGreaterThanOrEqual(20);
  });
});

describe("Effect integration — multiply_power", () => {
  it("logs increase_power multiple times and raises unit power", () => {
    const initialPower = 20;
    const unit = makeTestUnit({
      effects: [
        {
          id: "multiply_power",
          multiplier: 2,
          baseMultiplier: 2,
          targets: { id: "self" },
        },
      ],
      power: initialPower,
      cooldown: 500,
    });
    unit.id = "mult-power-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const incLogs = filterLogs(logs, "increase_power");
    expect(incLogs.length).toBeGreaterThanOrEqual(2);
    const csUnit = combatState.unitById.get("mult-power-unit")!;
    expect(csUnit.power).toBeGreaterThan(initialPower);
  });
});
