/// <reference types="jest" />

import * as CombatStatsTracker from "../Combat/CombatStatsTracker";
import * as Models from "../Models";

function makeUnit(id: string, force: string): Models.Unit {
  return {
    id,
    cardId: "test",
    pic: "test",
    force,
    position: [0, 0],
    power: 10,
    cooldown: 1000,
    evade: 0,
    rank: 1,
    effects: [],
    reactions: [],
    charge: 0,
    refresh: 0,
    hasted: 0,
    slowed: 0,
    silenced: 0,
    isCore: false,
    life: 100,
    maxLife: 100,
    critical: 0,
    shield: 0,
    bonusPower: 0,
  };
}

function makeCombatState(units: Models.Unit[]): Models.CombatState {
  const unitById = new Map(units.map((u) => [u.id, u]));
  const playerCore =
    units.find((u) => u.force === "PLAYER" && u.isCore) || units[0];
  const cpuCore = units.find((u) => u.force === "CPU" && u.isCore) || units[0];
  return {
    units,
    logs: [],
    enemyPlayerName: "CPU",
    wonCombat: false,
    finalPlayerUnits: [],
    initialUnits: [],
    unitById,
    playerCore,
    cpuCore,
    playerUnits: units.filter((u) => u.force === "PLAYER"),
    cpuUnits: units.filter((u) => u.force === "CPU"),
  };
}

describe("CombatStatsTracker", () => {
  describe("initialize", () => {
    it("creates unitStats for all units", () => {
      const units = [makeUnit("u1", "PLAYER"), makeUnit("u2", "CPU")];
      const state = makeCombatState(units);
      const tracker = CombatStatsTracker.initialize(state);
      expect(tracker.unitStats.size).toBe(2);
      expect(tracker.unitStats.get("u1")!.actionsPerformed).toBe(0);
      expect(tracker.unitStats.get("u1")!.damageDealt).toBe(0);
    });
  });

  describe("trackAction", () => {
    it("increments actions performed", () => {
      const u = makeUnit("u1", "PLAYER");
      const state = makeCombatState([u]);
      const tracker = CombatStatsTracker.initialize(state);
      CombatStatsTracker.trackAction(tracker, { unit: u });
      expect(tracker.unitStats.get("u1")!.actionsPerformed).toBe(1);
      CombatStatsTracker.trackAction(tracker, { unit: u });
      expect(tracker.unitStats.get("u1")!.actionsPerformed).toBe(2);
    });
  });

  describe("getUnitStats", () => {
    it("returns unit stats by id", () => {
      const u = makeUnit("u1", "PLAYER");
      const state = makeCombatState([u]);
      const tracker = CombatStatsTracker.initialize(state);
      const stats = CombatStatsTracker.getUnitStats(tracker, "u1");
      expect(stats!.unitId).toBe("u1");
    });
  });

  describe("trackDamage / trackHeal / trackPoison / trackRegen / trackShield", () => {
    it("tracks damage dealt", () => {
      const u = makeUnit("u1", "PLAYER");
      const state = makeCombatState([u]);
      const tracker = CombatStatsTracker.initialize(state);
      CombatStatsTracker.trackDamage(tracker, u, 50);
      expect(tracker.unitStats.get("u1")!.damageDealt).toBe(50);
    });

    it("ignores zero or negative amounts", () => {
      const u = makeUnit("u1", "PLAYER");
      const state = makeCombatState([u]);
      const tracker = CombatStatsTracker.initialize(state);
      CombatStatsTracker.trackDamage(tracker, u, 0);
      CombatStatsTracker.trackDamage(tracker, u, -10);
      expect(tracker.unitStats.get("u1")!.damageDealt).toBe(0);
    });

    it("tracks heal", () => {
      const u = makeUnit("u1", "PLAYER");
      const state = makeCombatState([u]);
      const tracker = CombatStatsTracker.initialize(state);
      CombatStatsTracker.trackHeal(tracker, u, 30);
      expect(tracker.unitStats.get("u1")!.healingDone).toBe(30);
    });

    it("tracks poison", () => {
      const u = makeUnit("u1", "PLAYER");
      const state = makeCombatState([u]);
      const tracker = CombatStatsTracker.initialize(state);
      CombatStatsTracker.trackPoison(tracker, u, 15);
      expect(tracker.unitStats.get("u1")!.poisonApplied).toBe(15);
    });

    it("tracks regen", () => {
      const u = makeUnit("u1", "PLAYER");
      const state = makeCombatState([u]);
      const tracker = CombatStatsTracker.initialize(state);
      CombatStatsTracker.trackRegen(tracker, u, 8);
      expect(tracker.unitStats.get("u1")!.regenApplied).toBe(8);
    });

    it("tracks shield", () => {
      const u = makeUnit("u1", "PLAYER");
      const state = makeCombatState([u]);
      const tracker = CombatStatsTracker.initialize(state);
      CombatStatsTracker.trackShield(tracker, u, 20);
      expect(tracker.unitStats.get("u1")!.shieldGranted).toBe(20);
    });

    it("accumulates stats across multiple calls", () => {
      const u = makeUnit("u1", "PLAYER");
      const state = makeCombatState([u]);
      const tracker = CombatStatsTracker.initialize(state);
      CombatStatsTracker.trackDamage(tracker, u, 10);
      CombatStatsTracker.trackDamage(tracker, u, 20);
      CombatStatsTracker.trackHeal(tracker, u, 5);
      CombatStatsTracker.trackHeal(tracker, u, 15);
      expect(tracker.unitStats.get("u1")!.damageDealt).toBe(30);
      expect(tracker.unitStats.get("u1")!.healingDone).toBe(20);
    });
  });

  describe("stop", () => {
    it("populates session runStats from tracker state", () => {
      const pc = { ...makeUnit("p", "PLAYER"), isCore: true, power: 100 };
      const units = [pc];
      const state = makeCombatState(units);
      const tracker = CombatStatsTracker.initialize(state);
      CombatStatsTracker.trackDamage(tracker, pc, 30);

      const session: Models.SessionData = {
        id: "s1",
        player_id: "p1",
        phase: "combat",
        session_type: { type: "singleplayer" },
        round: 1,
        step: 0,
        seed: "s",
        initial_seed: "s",
        options: [],
        team: { units },
        wins: 0,
        losses: 0,
        action_log: [],
      };
      CombatStatsTracker.stop(tracker, session);
      expect(session.runStats).toBeDefined();
      expect(session.runStats!.damageDealt).toBe(30);
      expect(session.runStats!.mostPowerfulUnit).toEqual({
        cardId: "test",
        power: 100,
      });
    });

    it("creates new runStats when undefined", () => {
      const u = makeUnit("u1", "PLAYER");
      const state = makeCombatState([u]);
      const tracker = CombatStatsTracker.initialize(state);

      const session: Models.SessionData = {
        id: "s2",
        player_id: "p2",
        phase: "combat",
        session_type: { type: "singleplayer" },
        round: 1,
        step: 0,
        seed: "s",
        initial_seed: "s",
        options: [],
        team: { units: [u] },
        wins: 0,
        losses: 0,
        action_log: [],
      };
      CombatStatsTracker.stop(tracker, session);
      expect(session.runStats!.damageDealt).toBe(0);
      expect(session.runStats!.poisonDealt).toBe(0);
      expect(session.runStats!.shieldDealt).toBe(0);
      expect(session.runStats!.regenDealt).toBe(0);
      expect(session.runStats!.healDealt).toBe(0);
    });
  });

  describe("units added after initialize (e.g. future summons)", () => {
    it("trackAction lazily registers unknown units instead of crashing", () => {
      const existing = makeUnit("u1", "PLAYER");
      const state = makeCombatState([existing]);
      const tracker = CombatStatsTracker.initialize(state);

      const summoned = makeUnit("summoned-1", "PLAYER");
      expect(() =>
        CombatStatsTracker.trackAction(tracker, { unit: summoned }),
      ).not.toThrow();

      expect(tracker.unitStats.get("summoned-1")!.actionsPerformed).toBe(1);
      expect(tracker.unitStats.get("summoned-1")!.forceId).toBe("PLAYER");
    });

    it("trackDamage lazily registers unknown units and credits their force stats", () => {
      const existing = makeUnit("u1", "PLAYER");
      const state = makeCombatState([existing]);
      const tracker = CombatStatsTracker.initialize(state);

      const summoned = makeUnit("summoned-1", "CPU");
      expect(() =>
        CombatStatsTracker.trackDamage(tracker, summoned, 250),
      ).not.toThrow();

      // Unit stats recorded…
      expect(tracker.unitStats.get("summoned-1")!.damageDealt).toBe(250);
      // …and force stats too, so threshold reactions keep working for them.
      const thresholds = CombatStatsTracker.initializeThresholds();
      const crossed = CombatStatsTracker.getCrossedThresholds(
        tracker,
        thresholds,
      );
      expect(crossed).toEqual([
        { forceId: "CPU", reactionId: "every_100_damage" },
        { forceId: "CPU", reactionId: "every_100_damage" },
      ]);
    });
  });

  describe("getCrossedThresholds", () => {
    it("returns nothing while stats are below threshold", () => {
      const u = makeUnit("u1", "PLAYER");
      const tracker = CombatStatsTracker.initialize(makeCombatState([u]));
      CombatStatsTracker.trackDamage(tracker, u, 99);

      const thresholds = CombatStatsTracker.initializeThresholds();
      expect(
        CombatStatsTracker.getCrossedThresholds(tracker, thresholds),
      ).toEqual([]);
    });

    it("fires once when a single threshold is crossed", () => {
      const u = makeUnit("u1", "PLAYER");
      const tracker = CombatStatsTracker.initialize(makeCombatState([u]));
      CombatStatsTracker.trackDamage(tracker, u, 150);

      const thresholds = CombatStatsTracker.initializeThresholds();
      expect(
        CombatStatsTracker.getCrossedThresholds(tracker, thresholds),
      ).toEqual([{ forceId: "PLAYER", reactionId: "every_100_damage" }]);
    });

    it("fires multiple times for a multi-threshold burst (500 damage in one hit)", () => {
      const u = makeUnit("u1", "PLAYER");
      const tracker = CombatStatsTracker.initialize(makeCombatState([u]));
      CombatStatsTracker.trackDamage(tracker, u, 500);

      const thresholds = CombatStatsTracker.initializeThresholds();
      const crossed = CombatStatsTracker.getCrossedThresholds(
        tracker,
        thresholds,
      );
      expect(crossed).toHaveLength(5);
      expect(crossed.every((c) => c.reactionId === "every_100_damage")).toBe(
        true,
      );
    });

    it("does not fire twice for the same threshold level across calls", () => {
      const u = makeUnit("u1", "PLAYER");
      const tracker = CombatStatsTracker.initialize(makeCombatState([u]));
      const thresholds = CombatStatsTracker.initializeThresholds();

      CombatStatsTracker.trackDamage(tracker, u, 500);
      expect(
        CombatStatsTracker.getCrossedThresholds(tracker, thresholds),
      ).toHaveLength(5);
      // Same accumulated stat, no new damage → nothing new crossed.
      expect(
        CombatStatsTracker.getCrossedThresholds(tracker, thresholds),
      ).toEqual([]);

      // Next hit crosses the 600 mark exactly once.
      CombatStatsTracker.trackDamage(tracker, u, 150);
      expect(
        CombatStatsTracker.getCrossedThresholds(tracker, thresholds),
      ).toEqual([{ forceId: "PLAYER", reactionId: "every_100_damage" }]);
    });

    it("tracks thresholds independently per force", () => {
      const p = makeUnit("p1", "PLAYER");
      const c = makeUnit("c1", "CPU");
      const tracker = CombatStatsTracker.initialize(makeCombatState([p, c]));
      const thresholds = CombatStatsTracker.initializeThresholds();

      CombatStatsTracker.trackDamage(tracker, p, 100);
      CombatStatsTracker.trackDamage(tracker, c, 250);

      const crossed = CombatStatsTracker.getCrossedThresholds(
        tracker,
        thresholds,
      );
      expect(crossed).toEqual([
        { forceId: "PLAYER", reactionId: "every_100_damage" },
        { forceId: "CPU", reactionId: "every_100_damage" },
        { forceId: "CPU", reactionId: "every_100_damage" },
      ]);
    });

    it("tracks each stat type with its own threshold and reactionId", () => {
      const u = makeUnit("u1", "PLAYER");
      const tracker = CombatStatsTracker.initialize(makeCombatState([u]));
      const thresholds = CombatStatsTracker.initializeThresholds();

      CombatStatsTracker.trackDamage(tracker, u, 100);
      CombatStatsTracker.trackPoison(tracker, u, 10);
      CombatStatsTracker.trackHeal(tracker, u, 100);
      CombatStatsTracker.trackRegen(tracker, u, 10);
      CombatStatsTracker.trackShield(tracker, u, 100);

      const crossed = CombatStatsTracker.getCrossedThresholds(
        tracker,
        thresholds,
      );
      expect(crossed).toEqual([
        { forceId: "PLAYER", reactionId: "every_100_damage" },
        { forceId: "PLAYER", reactionId: "every_10_poison" },
        { forceId: "PLAYER", reactionId: "every_100_heal" },
        { forceId: "PLAYER", reactionId: "every_10_regen" },
        { forceId: "PLAYER", reactionId: "every_100_shield" },
      ]);
    });
  });
});
