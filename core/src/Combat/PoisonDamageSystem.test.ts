/// <reference types="jest" />

import * as Poison from "../Combat/PoisonDamageSystem";

describe("PoisonDamageSystem", () => {
  describe("initializePoisonSystem", () => {
    it("returns empty poison rates map", () => {
      const state = Poison.initializePoisonSystem();
      expect(state.poisonRates.size).toBe(0);
    });
  });

  describe("applyPoison", () => {
    it("adds poison rate for a force", () => {
      const state = Poison.initializePoisonSystem();
      const next = Poison.applyPoison(state, "A", 50);
      expect(Poison.getPoisonRate(next, "A")).toBe(50);
    });

    it("stacks poison rates", () => {
      const state = Poison.initializePoisonSystem();
      const s1 = Poison.applyPoison(state, "A", 30);
      const s2 = Poison.applyPoison(s1, "A", 20);
      expect(Poison.getPoisonRate(s2, "A")).toBe(50);
    });

    it("returns same state for zero or negative amount", () => {
      const state = Poison.initializePoisonSystem();
      const s1 = Poison.applyPoison(state, "A", 0);
      expect(s1).toBe(state);
      const s2 = Poison.applyPoison(state, "A", -10);
      expect(s2).toBe(state);
    });

    it("does not mutate previous state", () => {
      const state = Poison.initializePoisonSystem();
      Poison.applyPoison(state, "A", 50);
      expect(Poison.getPoisonRate(state, "A")).toBe(0);
    });
  });

  describe("getPoisonRate", () => {
    it("returns 0 for unknown force", () => {
      const state = Poison.initializePoisonSystem();
      expect(Poison.getPoisonRate(state, "UNKNOWN")).toBe(0);
    });

    it("returns correct amount", () => {
      const state = Poison.initializePoisonSystem();
      const s1 = Poison.applyPoison(state, "A", 42);
      expect(Poison.getPoisonRate(s1, "A")).toBe(42);
    });
  });

  describe("reducePoison", () => {
    it("reduces poison rate when heal amount >= 20", () => {
      const state = Poison.initializePoisonSystem();
      const s1 = Poison.applyPoison(state, "A", 50);
      const s2 = Poison.reducePoison(s1, "A", 100);
      expect(Poison.getPoisonRate(s2, "A")).toBe(45); // 50 - floor(100 * 0.05)
    });

    it("removes poison rate when reduced to zero or below", () => {
      const state = Poison.initializePoisonSystem();
      const s1 = Poison.applyPoison(state, "A", 1);
      const s2 = Poison.reducePoison(s1, "A", 100); // reduces floor(100*0.05)=5, to -4
      expect(Poison.getPoisonRate(s2, "A")).toBe(0);
    });

    it("returns same state for heal amount < 20", () => {
      const state = Poison.initializePoisonSystem();
      const s1 = Poison.applyPoison(state, "A", 50);
      const s2 = Poison.reducePoison(s1, "A", 10);
      expect(s2).toBe(s1);
    });

    it("returns same state when no poison exists", () => {
      const state = Poison.initializePoisonSystem();
      const s2 = Poison.reducePoison(state, "A", 100);
      expect(s2).toBe(state);
    });
  });

  describe("clearPoison", () => {
    it("removes poison for a force", () => {
      const state = Poison.initializePoisonSystem();
      const s1 = Poison.applyPoison(state, "A", 50);
      const s2 = Poison.clearPoison(s1, "A");
      expect(Poison.getPoisonRate(s2, "A")).toBe(0);
    });

    it("does not affect other forces", () => {
      const state = Poison.initializePoisonSystem();
      const s1 = Poison.applyPoison(state, "A", 50);
      const s2 = Poison.applyPoison(s1, "B", 30);
      const s3 = Poison.clearPoison(s2, "A");
      expect(Poison.getPoisonRate(s3, "A")).toBe(0);
      expect(Poison.getPoisonRate(s3, "B")).toBe(30);
    });
  });

  describe("getPoisonRate", () => {
    it("returns 0 for unset force", () => {
      const state = Poison.initializePoisonSystem();
      expect(Poison.getPoisonRate(state, "Z")).toBe(0);
    });
  });
});
