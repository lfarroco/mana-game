/// <reference types="jest" />

import * as PhaseConfig from "./PhaseConfig";
import * as Models from "../Models";

describe("PhaseConfig", () => {
  describe("getPhaseForTurn", () => {
    it("returns encounter for round 1 step 0", () => {
      expect(PhaseConfig.getPhaseForTurn(1, 0)).toBe("encounter");
    });

    it("returns combat for round 1 step 4", () => {
      expect(PhaseConfig.getPhaseForTurn(1, 4)).toBe("combat");
    });

    it("returns upgrade_core for round 1 step 5", () => {
      expect(PhaseConfig.getPhaseForTurn(1, 5)).toBe("upgrade_core");
    });

    it("returns add_reaction_core for round 2 step 5", () => {
      expect(PhaseConfig.getPhaseForTurn(2, 5)).toBe("add_reaction_core");
    });

    it("returns undefined for out-of-bounds step", () => {
      expect(PhaseConfig.getPhaseForTurn(1, 99)).toBeUndefined();
    });

    it("falls back to DEFAULT for unlisted rounds", () => {
      expect(PhaseConfig.getPhaseForTurn(99, 0)).toBe("encounter");
      expect(PhaseConfig.getPhaseForTurn(99, 4)).toBe("combat");
    });
  });

  describe("ROUND_PHASES", () => {
    it("has 6 phases per round", () => {
      for (const round of [1, 2, 3, 5, 10]) {
        expect(PhaseConfig.ROUND_PHASES[round]).toHaveLength(6);
      }
    });

    it("rounds 2, 6, 10 have add_reaction_core at step 5", () => {
      expect(PhaseConfig.ROUND_PHASES[2][5]).toBe("add_reaction_core");
      expect(PhaseConfig.ROUND_PHASES[6][5]).toBe("add_reaction_core");
      expect(PhaseConfig.ROUND_PHASES[10][5]).toBe("add_reaction_core");
    });
  });

  describe("remainingCoreUpgradeWindows", () => {
    it("counts all 15 windows at the start of a run", () => {
      expect(PhaseConfig.TOTAL_CORE_UPGRADE_WINDOWS).toBe(15);
      expect(PhaseConfig.remainingCoreUpgradeWindows(1, 0)).toBe(15);
    });

    it("counts the window the session is currently parked on", () => {
      // Round 1 step 5 IS the first upgrade_core window.
      expect(PhaseConfig.remainingCoreUpgradeWindows(1, 5)).toBe(15);
    });

    it("drops by one after each window is passed", () => {
      // Round 2 opens with the second window still ahead (step 5).
      expect(PhaseConfig.remainingCoreUpgradeWindows(2, 0)).toBe(14);
      expect(PhaseConfig.remainingCoreUpgradeWindows(2, 5)).toBe(14);
      expect(PhaseConfig.remainingCoreUpgradeWindows(2, 6)).toBe(13);
    });

    it("counts down to 1 on the final window (round 15 step 5)", () => {
      expect(PhaseConfig.remainingCoreUpgradeWindows(15, 5)).toBe(1);
    });

    it("is zero from round 16 — Infinite mode drops the upgrade phases", () => {
      expect(PhaseConfig.remainingCoreUpgradeWindows(16, 0)).toBe(0);
      expect(PhaseConfig.remainingCoreUpgradeWindows(30, 4)).toBe(0);
    });

    it("classifies both upgrade phases as core-upgrade windows", () => {
      expect(PhaseConfig.isCoreUpgradePhase("upgrade_core")).toBe(true);
      expect(PhaseConfig.isCoreUpgradePhase("add_reaction_core")).toBe(true);
      expect(PhaseConfig.isCoreUpgradePhase("combat")).toBe(false);
      expect(PhaseConfig.isCoreUpgradePhase("encounter")).toBe(false);
    });
  });

  describe("advanceToNextPhase", () => {
    it("increments step when next phase exists", () => {
      const session = makeMockSession(1, 0);
      PhaseConfig.advanceToNextPhase(session);
      expect(session.step).toBe(1);
      expect(session.phase).toBe("encounter");
    });

    it("wraps to next round when step exceeds phases", () => {
      const session = makeMockSession(1, 5);
      PhaseConfig.advanceToNextPhase(session);
      expect(session.step).toBe(0);
      expect(session.round).toBe(2);
    });
  });
});

function makeMockSession(round: number, step: number): Models.SessionData {
  return {
    id: "test",
    player_id: "p1",
    session_type: { type: "singleplayer" },
    phase: "encounter",
    round,
    step,
    seed: "test-seed",
    initial_seed: "test-seed",
    options: [],
    team: { units: [] },
    wins: 0,
    losses: 0,
    action_log: [],
  };
}
