/// <reference types="jest" />

/**
 * C1 — `repeat` on effects (docs/wacky-content-plan.md).
 *
 * `repeat` re-fires an effect N times per cast. Each fire logs its own
 * cast/hit entries (deterministic playback); non-repeated effects are
 * untouched. The balance gate caps repeat at 3 and reserves it for gold or
 * very-slow cards (BaseCollection.balance.test.ts).
 */

import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  setupCombat,
  runUntil,
  filterLogs,
} from "../__test_utils__/combatHarness";
import type { Effect } from "../Models";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

describe("effect repeat (C1)", () => {
  it("re-fires damage N times per cast, logging each hit", () => {
    const attacker = makeTestUnit({
      effects: [{ id: "damage", repeat: 2 }] as Effect[],
      power: 10,
      cooldown: 1000,
      position: [0, 0],
    });
    attacker.id = "attacker";
    const { combatRunner, combatState } = setupCombat([attacker]);

    // Damage hits land 200ms after the cast (projectile travel) — wait for the
    // deferred hit logs so the per-repeat cast/hit pairs are complete.
    const logs = runUntil(
      combatRunner,
      combatState,
      (logs) => filterLogs(logs, "damage_hit").length >= 2,
    );

    const casts = filterLogs(logs, "damage_cast");
    const hits = filterLogs(logs, "damage_hit");
    expect(casts).toHaveLength(2);
    expect(hits).toHaveLength(2);
    expect(hits.reduce((sum, h) => sum + h.amount, 0)).toBe(20); // 2 × power 10
  });

  it("keeps single-cast behavior when no repeat is set", () => {
    const attacker = makeTestUnit({
      effects: [{ id: "damage" }] as Effect[],
      power: 10,
      cooldown: 1000,
      position: [0, 0],
    });
    attacker.id = "attacker";
    const { combatRunner, combatState } = setupCombat([attacker]);

    const logs = runUntil(
      combatRunner,
      combatState,
      (logs) => filterLogs(logs, "damage_hit").length >= 1,
    );

    expect(filterLogs(logs, "damage_cast")).toHaveLength(1);
    expect(filterLogs(logs, "damage_hit")).toHaveLength(1);
  });
});
