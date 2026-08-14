/**
 * CombatSimulation integration tests for shield accumulation and
 * damage routing through shields.
 * Split out of CombatSimulation.test.ts — shares the same harness.
 */
/// <reference types="jest" />

import * as Card from "../Entities/Card";
import * as Constants from "../Constants";
import * as CombatSimulation from "./CombatSimulation";
import {
  createTestCombat,
  createCustomCombat,
  simulateCombatForFrames,
} from "../__test_utils__/combatSimulationHarness";

afterAll(() => {
  Card.resetCardsMap();
});

describe("Shield accumulation and damage routing", () => {
  it("shield accumulates across multiple shield_hit log entries", () => {
    const shieldUnit = Card.makeUnit(
      Constants.FORCE_ID_PLAYER,
      "aegis_archon",
      [1, 0],
    );
    shieldUnit.cooldown = 100;
    shieldUnit.power = 10; // 10 shield per cast

    const { session, enemyTeam } = createCustomCombat(
      [shieldUnit],
      5000,
      1,
      "test-shield-accum-001",
    );
    // Run enough frames for 2+ shield casts to hit
    const logs = simulateCombatForFrames(session, enemyTeam, 100);

    const shieldHits = logs.filter((l) => l.type === "shield_hit");
    expect(shieldHits.length).toBeGreaterThanOrEqual(2);

    // Shield should increase with each hit
    const newShields = shieldHits
      .map((h) => h.newShield!)
      .filter((s) => s !== undefined);
    for (let i = 1; i < newShields.length; i++) {
      expect(newShields[i]).toBeGreaterThan(newShields[i - 1]);
    }
  });

  it("shield_hit entries carry newShield", () => {
    const shieldUnit = Card.makeUnit(
      Constants.FORCE_ID_PLAYER,
      "aegis_archon",
      [1, 0],
    );
    shieldUnit.cooldown = 100;

    const { session, enemyTeam } = createCustomCombat(
      [shieldUnit],
      5000,
      1,
      "test-shield-new-001",
    );
    const logs = simulateCombatForFrames(session, enemyTeam, 50);

    const shieldHits = logs.filter((l) => l.type === "shield_hit");
    expect(shieldHits.length).toBeGreaterThan(0);

    for (const hit of shieldHits) {
      expect(typeof hit.newShield).toBe("number");
      expect(hit.newShield).toBeGreaterThan(0);
    }
  });

  it("damage_hit carries both newLife and newShield", () => {
    const state = createTestCombat(500, 500);

    const result = CombatSimulation.simulateCombat(
      state.session,
      state.combatState,
    );

    const damageHits = result.logs.filter((l) => l.type === "damage_hit");
    expect(damageHits.length).toBeGreaterThan(0);

    for (const hit of damageHits) {
      expect(typeof hit.newLife).toBe("number");
      expect(typeof hit.newShield).toBe("number");
      expect(hit.lifeDelta).toBeDefined();
      expect(typeof hit.lifeDelta).toBe("number");
      expect(hit.lifeDelta).toBeLessThanOrEqual(0); // damage is never positive
    }
  });
});

