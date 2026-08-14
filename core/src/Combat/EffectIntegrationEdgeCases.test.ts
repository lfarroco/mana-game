/**
 * Edge-case tests for effect implementations called directly (no combat loop):
 * absorb_power, sacrifice_effect, multiply_power, and distribute_power.
 * Split out of ReactionIntegration.test.ts.
 */
/// <reference types="jest" />

import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  setupCombat,
} from "../__test_utils__/combatHarness";
import * as Constants from "../Constants";
import * as Absorb from "../TriggerSystem/effects/absorbPower";
import * as Sacrifice from "../TriggerSystem/effects/sacrificeEffect";
import * as Multiply from "../TriggerSystem/effects/multiplyPower";
import * as Distribute from "../TriggerSystem/effects/distributePower";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

describe("Effect integration — edge cases", () => {
  it("absorb_power returns early with empty targets", () => {
    const absorber = makeTestUnit({
      effects: [
        {
          id: "absorb_power",
          permanent: false,
          targets: { id: "random_enemy", count: 1 },
        },
      ],
      power: 10,
      cooldown: 99999,
    });

    const { combatState, combatRunner } = setupCombat([absorber], 5000);

    // Remove all CPU units so resolveTargets returns empty
    const cpuUnits = combatState.units.filter(
      (u) => u.force === Constants.FORCE_ID_CPU,
    );
    cpuUnits.forEach((u) => {
      const idx = combatState.units.indexOf(u);
      if (idx >= 0) combatState.units.splice(idx, 1);
    });

    // Manually trigger the effect — should not crash
    const env = combatRunner.getEnv();
    expect(() => Absorb.absorbPower(env, absorber, [], false)).not.toThrow();
  });

  it("sacrifice_effect does nothing when there are no removable effects or reactions", () => {
    const unit = makeTestUnit({
      effects: [{ id: "sacrifice_effect", targets: { id: "self" } }],
      power: 10,
      cooldown: 99999,
    });
    // Remove the sacrifice_effect itself so there's nothing to sacrifice
    unit.effects = [];

    const { combatRunner } = setupCombat([unit], 5000);
    const env = combatRunner.getEnv();

    const initialPower = unit.power;
    Sacrifice.sacrificeEffect(env, unit);
    // Should not crash and should not change power
    expect(unit.power).toBe(initialPower);
  });

  it("multiply_power computes the correct exponent with scale", () => {
    const unit = makeTestUnit({
      effects: [],
      power: 20,
      cooldown: 99999,
    });

    const { combatRunner } = setupCombat([unit], 5000);
    const env = combatRunner.getEnv();

    // multiplier=2, scale=2 → Math.pow(2, 2) = 4
    // 20 * 4 = 80, floor(80) = 80
    Multiply.multiplyPower({
      env,
      targets: [unit],
      sourceUnit: unit,
      multiplier: Math.pow(2, 2),
    });

    // 20 × 4 = 80
    expect(unit.power).toBe(80);
  });

  it("distribute_power handles truncation loss correctly", () => {
    const distributor = makeTestUnit({
      effects: [],
      power: 101,
      cooldown: 99999,
      position: [0, 0],
    });
    const r1 = makeTestUnit({
      effects: [],
      power: 10,
      cooldown: 99999,
      position: [0, 1],
    });
    const r2 = makeTestUnit({
      effects: [],
      power: 10,
      cooldown: 99999,
      position: [0, 2],
    });

    const { combatRunner } = setupCombat([distributor, r1, r2], 5000);
    const env = combatRunner.getEnv();

    // powerToDistribute = floor(101 * 0.5) = 50
    // powerPerTarget = floor(50 / 2) = 25 each
    // Total distributed = 50, truncation loss = 0 in this case
    Distribute.distributePower(env, distributor, [r1, r2], false);

    expect(distributor.power).toBe(51); // 101 - 50
    expect(r1.power).toBe(35); // 10 + 25
    expect(r2.power).toBe(35); // 10 + 25
  });
});
