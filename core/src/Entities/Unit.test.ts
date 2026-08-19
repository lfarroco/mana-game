/// <reference types="jest" />

import * as Unit from "../Entities/Unit";
import * as Models from "../Models";

function makeUnit(overrides: Partial<Models.Unit> = {}): Models.Unit {
  return {
    id: "unit-1",
    cardId: "test-card",
    pic: "test-pic",
    force: "PLAYER",
    position: [0, 0],
    power: 50,
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
    ...overrides,
  };
}

describe("Unit", () => {
  describe("calculateCritical", () => {
    it("returns not critical when unit has 0 critical chance", () => {
      const u = makeUnit({ critical: 0 });
      const rng = { seed: "test-seed" };
      const result = Unit.calculateCritical(rng, u);
      expect(result.isCritical).toBe(false);
      expect(result.multiplier).toBe(1);
      expect(result.bonusPower).toBe(0);
    });

    it("is critical when unit has 100 critical chance", () => {
      const u = makeUnit({ critical: 100 });
      const rng = { seed: "test-seed" };
      const result = Unit.calculateCritical(rng, u);
      expect(result.isCritical).toBe(true);
    });

    it("returns multiplier of 2 on critical", () => {
      const u = makeUnit({ critical: 100 });
      const rng = { seed: "test-seed" };
      const result = Unit.calculateCritical(rng, u);
      expect(result.multiplier).toBe(2);
    });

    it("caps effective critical chance at 100", () => {
      const u = makeUnit({ critical: 200 });
      const rng = { seed: "test-seed" };
      const result = Unit.calculateCritical(rng, u);
      expect(result.isCritical).toBe(true);
    });

    it("excess critical beyond 100 grants bonus power", () => {
      const u = makeUnit({ critical: 105 });
      const rng = { seed: "test-seed" };
      const result = Unit.calculateCritical(rng, u);
      expect(result.isCritical).toBe(true);
      expect(result.bonusPower).toBe(1); // floor(5 / 5)
    });

    it("returns zero bonus power when critical <= 100", () => {
      const u = makeUnit({ critical: 100 });
      const rng = { seed: "test-seed" };
      const result = Unit.calculateCritical(rng, u);
      expect(result.bonusPower).toBe(0);
    });

    it("advances the rng seed", () => {
      const u = makeUnit({ critical: 50 });
      const rng = { seed: "test-seed" };
      const result = Unit.calculateCritical(rng, u);
      expect(result.seed).toBeTruthy();
      expect(result.seed).not.toBe("");
    });

    it("is deterministic for same seed and stats", () => {
      const u = makeUnit({ critical: 50 });
      const rng1 = { seed: "fixed" };
      const rng2 = { seed: "fixed" };
      const r1 = Unit.calculateCritical(rng1, u);
      const r2 = Unit.calculateCritical(rng2, u);
      expect(r1.isCritical).toBe(r2.isCritical);
      expect(r1.multiplier).toBe(r2.multiplier);
      expect(r1.bonusPower).toBe(r2.bonusPower);
    });
  });

  describe("applyPowerDelta", () => {
    it("increases power by delta", () => {
      const u = makeUnit({ power: 10 });
      const delta = Unit.applyPowerDelta(u, 5, false);
      expect(u.power).toBe(15);
      expect(delta).toBe(5);
    });

    it("decreases power by delta", () => {
      const u = makeUnit({ power: 10 });
      const delta = Unit.applyPowerDelta(u, -3, false);
      expect(u.power).toBe(7);
      expect(delta).toBe(-3);
    });

    it("clamps power to 0 minimum", () => {
      const u = makeUnit({ power: 5 });
      const delta = Unit.applyPowerDelta(u, -20, false);
      expect(u.power).toBe(0);
      expect(delta).toBe(-5);
    });

    it("tracks permanent bonus power", () => {
      const u = makeUnit({ power: 10, bonusPower: 0 });
      Unit.applyPowerDelta(u, 8, true);
      expect(u.power).toBe(18);
      expect(u.bonusPower).toBe(8);
    });

    it("does not track bonus power when non-permanent", () => {
      const u = makeUnit({ power: 10, bonusPower: 0 });
      Unit.applyPowerDelta(u, 8, false);
      expect(u.power).toBe(18);
      expect(u.bonusPower).toBe(0);
    });

    it("stacks permanent bonus power", () => {
      const u = makeUnit({ power: 10, bonusPower: 2 });
      Unit.applyPowerDelta(u, 5, true);
      expect(u.bonusPower).toBe(7);
    });

    it("clamps negative permanent bonus correctly", () => {
      const u = makeUnit({ power: 5, bonusPower: 10 });
      Unit.applyPowerDelta(u, -20, true);
      expect(u.power).toBe(0);
      expect(u.bonusPower).toBe(5); // 10 + (-5) = 5
    });
  });
});
