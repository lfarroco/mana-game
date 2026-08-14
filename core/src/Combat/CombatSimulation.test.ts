/**
 * Tests for the pure combat simulation (log generation).
 * These tests run in Jest (jsdom environment) but don't require
 * any browser APIs — the combat logic is pure data transformations.
 */
/// <reference types="jest" />

import * as Card from "../Entities/Card";
import * as CombatSimulation from "./CombatSimulation";
import { createTestCombat } from "../__test_utils__/combatSimulationHarness";

// Cards are statically available — no registration needed.
// Card.resetCardsMap() ensures clean state for test isolation.

afterAll(() => {
  Card.resetCardsMap();
});

describe("Combat simulation log generation", () => {
  it("generates combat logs when two cores fight (player 100 HP, cpu 200 HP)", () => {
    const state = createTestCombat(100, 200);

    const result = CombatSimulation.simulateCombat(
      state.session,
      state.combatState,
    );

    expect(result.logs.length).toBeGreaterThan(0);

    const lastLog = result.logs[result.logs.length - 1];
    expect(lastLog.type).toBe("outcome");
    if (lastLog.type === "outcome") {
      expect(["player_won", "player_lost", "both_won"]).toContain(
        lastLog.result,
      );
    }

    const damageLogs = result.logs.filter((l) => l.type === "damage_cast");
    expect(damageLogs.length).toBeGreaterThan(0);

    for (const dmg of damageLogs) {
      expect(dmg.sourceId).toBeDefined();
      expect(dmg.targetId).toBeDefined();
      expect(typeof dmg.amount).toBe("number");
      expect(dmg.amount).toBeGreaterThan(0);
    }

    for (let i = 1; i < result.logs.length; i++) {
      expect(result.logs[i].timeMs).toBeGreaterThanOrEqual(
        result.logs[i - 1].timeMs,
      );
    }
  });

  it("a 100 HP core dies before a 200 HP core (both have same damage)", () => {
    const { session, combatState } = createTestCombat(100, 200);

    const result = CombatSimulation.simulateCombat(session, combatState);

    const lastLog = result.logs[result.logs.length - 1];
    expect(lastLog.type).toBe("outcome");
    if (lastLog.type === "outcome") {
      expect(lastLog.result).toBe("player_lost");
    }
  });

  it("player wins when player core has more life than cpu core (500 vs 100)", () => {
    const state = createTestCombat(500, 100);

    const result = CombatSimulation.simulateCombat(
      state.session,
      state.combatState,
    );

    const lastLog = result.logs[result.logs.length - 1];
    expect(lastLog.type).toBe("outcome");
    if (lastLog.type === "outcome") {
      expect(lastLog.result).toBe("player_won");
    }
  });

  it("both_won when combat times out (both cores alive after max duration)", () => {
    const state = createTestCombat(99999, 99999, 1, 1, "test-seed-004");

    const result = CombatSimulation.simulateCombat(
      state.session,
      state.combatState,
    );

    const lastLog = result.logs[result.logs.length - 1];
    expect(lastLog.type).toBe("outcome");
    if (lastLog.type === "outcome") {
      expect(lastLog.result).toBe("both_won");
    }
  });

  it("sets wonCombat to true when player wins", () => {
    const state = createTestCombat(500, 100);

    const result = CombatSimulation.simulateCombat(
      state.session,
      state.combatState,
    );

    expect(result.wonCombat).toBe(true);
  });

  it("sets wonCombat to false when player loses", () => {
    const state = createTestCombat(100, 200);

    const result = CombatSimulation.simulateCombat(
      state.session,
      state.combatState,
    );

    expect(result.wonCombat).toBe(false);
  });

  it("sets wonCombat to true when both win (timeout)", () => {
    const state = createTestCombat(99999, 99999, 1, 1, "test-seed-005");

    const result = CombatSimulation.simulateCombat(
      state.session,
      state.combatState,
    );

    expect(result.wonCombat).toBe(true);
  });

  it("initialUnits is a separate clone, not aliased to units", () => {
    const state = createTestCombat(500, 100);
    const { combatState } = state;

    expect(combatState.initialUnits).not.toBe(combatState.units);
    expect(combatState.initialUnits).toEqual(combatState.units);
  });

  it("includes combat_stats log entry", () => {
    const state = createTestCombat(100, 200);

    const result = CombatSimulation.simulateCombat(
      state.session,
      state.combatState,
    );

    const statsLog = result.logs.find((l) => l.type === "combat_stats");
    expect(statsLog).toBeDefined();
    expect(statsLog!.unitStats).toBeDefined();
    expect(statsLog!.currentCombatStats).toBeDefined();
  });

  // ---- Cast/Hit split tests ----

  it("damage_cast and damage_hit are logged as separate entries with travelTime", () => {
    const state = createTestCombat(200, 200);

    const result = CombatSimulation.simulateCombat(
      state.session,
      state.combatState,
    );

    const castLogs = result.logs.filter((l) => l.type === "damage_cast");
    const hitLogs = result.logs.filter((l) => l.type === "damage_hit");

    expect(castLogs.length).toBeGreaterThan(0);
    expect(hitLogs.length).toBeGreaterThan(0);

    for (const cast of castLogs) {
      expect(typeof cast.travelTime).toBe("number");
      expect(cast.travelTime).toBeGreaterThan(0);
    }

    for (const hit of hitLogs) {
      expect(typeof hit.newLife).toBe("number");
    }

    const match = hitLogs.find(
      (h) =>
        h.sourceId === castLogs[0].sourceId && h.amount === castLogs[0].amount,
    );
    expect(match).toBeDefined();
    expect(match!.targetId).toBe(castLogs[0].targetId);
  });
});

describe("determineCombatOutcome", () => {
  it("returns true for player_won outcome", () => {
    const result = CombatSimulation.determineCombatOutcome([
      { type: "outcome", result: "player_won", timeMs: 1000 },
    ]);
    expect(result).toBe(true);
  });

  it("returns true for both_won outcome", () => {
    const result = CombatSimulation.determineCombatOutcome([
      { type: "outcome", result: "both_won", timeMs: 1000 },
    ]);
    expect(result).toBe(true);
  });

  it("returns false for player_lost outcome", () => {
    const result = CombatSimulation.determineCombatOutcome([
      { type: "outcome", result: "player_lost", timeMs: 1000 },
    ]);
    expect(result).toBe(false);
  });

  it("returns false (loss) when no outcome log entry exists (MAX_FRAMES scenario)", () => {
    const result = CombatSimulation.determineCombatOutcome([
      {
        type: "damage_cast",
        sourceId: "a",
        targetId: "b",
        amount: 10,
        travelTime: 200,
        timeMs: 0,
      },
    ]);
    expect(result).toBe(false);
  });
});
