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
