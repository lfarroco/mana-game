/**
 * Integration tests for power-transfer effects in the combat simulation:
 * distribute_power, absorb_power, and sacrifice_effect.
 * Split out of EffectIntegration.test.ts.
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

describe("Effect integration — distribute_power", () => {
  it("distributes power from distributor to ally and logs accordingly", () => {
    const distributor = makeTestUnit({
      effects: [
        {
          id: "distribute_power",
          permanent: false,
          targets: { id: "random_ally", count: 1 },
        },
      ],
      power: 100,
      cooldown: 500,
      position: [0, 0],
    });
    distributor.id = "distributor";

    const receiver = makeTestUnit({
      effects: [{ id: "damage" }],
      cooldown: 99999,
      position: [1, 0],
    });
    receiver.id = "receiver";

    const { combatState, combatRunner } = setupCombat([distributor, receiver]);

    const initialDistPower = distributor.power;

    const logs = runFrames(combatRunner, combatState, 200);

    const csDistributor = combatState.unitById.get("distributor")!;
    expect(csDistributor.power).toBeLessThan(initialDistPower);

    const incLogs = logs.filter(
      (l) => l.type === "increase_power" && l.targetId === receiver.id,
    );
    // distributor gives 50% to ally, but random_ally may target core instead
    // In any case, distributor should have lost power
    expect(
      incLogs.length +
        logs.filter(
          (l) =>
            l.type === "increase_power" &&
            l.targetId !== csDistributor.id &&
            l.targetId !== receiver.id,
        ).length,
    ).toBeGreaterThanOrEqual(1);
  });
});

describe("Effect integration — absorb_power", () => {
  it("absorbs power from enemy and logs decrease_power + increase_power", () => {
    const absorber = makeTestUnit({
      effects: [
        {
          id: "absorb_power",
          permanent: false,
          targets: { id: "random_enemy", count: 1 },
        },
      ],
      cooldown: 500,
    });
    absorber.id = "absorber";
    const initialAbsorberPower = absorber.power;

    const { combatState, combatRunner } = setupCombat([absorber]);

    const cpuCore = combatState.cpuCore;
    cpuCore.power = 100;
    const initialCpuPower = cpuCore.power;

    const logs = runFrames(combatRunner, combatState, 200);

    const decLogs = logs.filter((l) => l.type === "decrease_power");
    expect(decLogs.length).toBeGreaterThanOrEqual(2);
    const csAbsorber = combatState.unitById.get("absorber")!;
    expect(csAbsorber.power).toBeGreaterThan(initialAbsorberPower);
    const csCpuCore = combatState.cpuCore;
    expect(csCpuCore.power).toBeLessThan(initialCpuPower);
  });
});

describe("Effect integration — sacrifice_effect", () => {
  it("removes an effect and increases own power", () => {
    const initialPower = 10;
    const unit = makeTestUnit({
      effects: [
        { id: "sacrifice_effect", targets: { id: "self" } },
        { id: "shield" },
      ],
      power: initialPower,
      cooldown: 500,
    });
    unit.id = "sacrifice-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const incLogs = logs.filter((l) => l.type === "increase_power");
    expect(incLogs.length).toBeGreaterThanOrEqual(1);
    const csUnit = combatState.unitById.get("sacrifice-unit")!;
    expect(csUnit.power).toBeGreaterThan(initialPower);
  });
});
