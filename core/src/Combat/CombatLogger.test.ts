/// <reference types="jest" />

import * as CombatLogger from "../Combat/CombatLogger";

describe("CombatLogger", () => {
  describe("createCombatLogger", () => {
    it("creates a logger with initial time of 0", () => {
      const logger = CombatLogger.createCombatLogger();
      expect(logger.getCurrentTimeMs()).toBe(0);
    });

    it("starts with empty logs", () => {
      const logger = CombatLogger.createCombatLogger();
      expect(logger.getLogs()).toEqual([]);
    });
  });

  describe("log", () => {
    it("adds entry with current time by default", () => {
      const logger = CombatLogger.createCombatLogger();
      logger.setCurrentTimeMs(500);
      logger.log({ type: "storm_start" });
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe("storm_start");
      expect(logs[0].timeMs).toBe(500);
    });

    it("adds entry with explicit time when provided", () => {
      const logger = CombatLogger.createCombatLogger();
      logger.log(
        {
          type: "damage_cast",
          sourceId: "s",
          targetId: "t",
          amount: 50,
          travelTime: 200,
        },
        1000,
      );
      const logs = logger.getLogs();
      expect(logs[0].timeMs).toBe(1000);
    });

    it("preserves all entry properties", () => {
      const logger = CombatLogger.createCombatLogger();
      const entry: CombatLogger.CombatLogInput = {
        type: "damage_hit",
        sourceId: "unit1",
        targetId: "unit2",
        amount: 42,
        newLife: 58,
        lifeDelta: -42,
        newShield: 0,
        shieldDelta: 0,
      };
      logger.log(entry, 300);
      const logs = logger.getLogs();
      expect(logs[0]).toEqual({ ...entry, timeMs: 300 });
    });

    it("accumulates multiple entries", () => {
      const logger = CombatLogger.createCombatLogger();
      logger.log({ type: "reaction", unitId: "u1" });
      logger.log({ type: "reaction", unitId: "u2" });
      logger.log({ type: "outcome", result: "player_won" });
      expect(logger.getLogs()).toHaveLength(3);
    });
  });

  describe("setCurrentTimeMs", () => {
    it("updates the current time", () => {
      const logger = CombatLogger.createCombatLogger();
      logger.setCurrentTimeMs(1234);
      expect(logger.getCurrentTimeMs()).toBe(1234);
    });
  });

  describe("getCurrentTimeMs", () => {
    it("returns the set time", () => {
      const logger = CombatLogger.createCombatLogger();
      logger.setCurrentTimeMs(999);
      expect(logger.getCurrentTimeMs()).toBe(999);
    });
  });

  describe("getLogs", () => {
    it("returns a reference to the internal array", () => {
      const logger = CombatLogger.createCombatLogger();
      logger.log({ type: "storm_start" });
      const logs1 = logger.getLogs();
      const logs2 = logger.getLogs();
      expect(logs1).toBe(logs2);
    });
  });
});
