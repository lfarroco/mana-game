/**
 * Tests for CombatCodec — serialize / deserialize round-trip.
 */
/// <reference types="jest" />

import * as Card from "../Entities/Card";
import * as Constants from "../math/Constants";
import * as CombatSimulation from "./CombatSimulation";
import * as CombatCodec from "./CombatCodec";

afterAll(() => {
  Card.resetCardsMap();
});

describe("CombatCodec", () => {
  describe("round-trip", () => {
    it("serialize → deserialize preserves all source data", () => {
      const session = createMinimalSession("codec-test-001");
      const enemyTeam = [
        Card.makeUnit(Constants.FORCE_ID_CPU, "critical_crystal", [3, 1]),
      ];

      const combatState = CombatSimulation.createCombatState(
        session,
        enemyTeam,
        "TestRival",
      );
      // Simulate combat to get logs
      const finalState = CombatSimulation.simulateCombat(session, combatState);

      const dto = CombatCodec.serializeCombatState(finalState);
      const restored = CombatCodec.deserializeCombatState(dto);

      // Source data matches
      expect(restored.logs).toEqual(finalState.logs);
      expect(restored.wonCombat).toBe(finalState.wonCombat);
      expect(restored.enemyPlayerName).toBe("TestRival");

      // Derived fields are rebuilt
      expect(restored.unitById).toBeInstanceOf(Map);
      expect(restored.unitById.size).toBe(finalState.unitById.size);
      for (const [id, unit] of restored.unitById) {
        expect(unit.id).toBe(id);
      }
      expect(restored.playerCore.isCore).toBe(true);
      expect(restored.cpuCore.isCore).toBe(true);
      expect(restored.playerCore.force).not.toBe(restored.cpuCore.force);
    });

    it("DTO is plain JSON-safe (no Maps, no functions)", () => {
      const session = createMinimalSession("codec-json-001");
      const enemyTeam = [
        Card.makeUnit(Constants.FORCE_ID_CPU, "critical_crystal", [3, 1]),
      ];
      const combatState = CombatSimulation.createCombatState(
        session,
        enemyTeam,
        "TestRival",
      );
      const finalState = CombatSimulation.simulateCombat(session, combatState);
      const dto = CombatCodec.serializeCombatState(finalState);

      const json = JSON.stringify(dto);
      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(typeof parsed.wonCombat).toBe("boolean");
      expect(typeof parsed.enemyPlayerName).toBe("string");
      expect(Array.isArray(parsed.units)).toBe(true);
      expect(Array.isArray(parsed.logs)).toBe(true);
    });

    it("handles wonCombat = false", () => {
      const session = createMinimalSession("codec-loss-001");
      const enemyTeam = [
        Card.makeUnit(Constants.FORCE_ID_CPU, "critical_crystal", [3, 1]),
      ];
      // Make player core very weak to lose
      const pc = session.team.units[0];
      pc.life = 1;
      pc.maxLife = 1;
      pc.power = 1;

      const combatState = CombatSimulation.createCombatState(
        session,
        enemyTeam,
      );
      const finalState = CombatSimulation.simulateCombat(session, combatState);

      const dto = CombatCodec.serializeCombatState(finalState);
      const restored = CombatCodec.deserializeCombatState(dto);

      expect(dto.wonCombat).toBe(false);
      expect(restored.wonCombat).toBe(false);
    });
  });
});

function createMinimalSession(seed: string) {
  const playerCore = Card.makeUnit(
    Constants.FORCE_ID_PLAYER,
    "critical_crystal",
    [1, 1],
  );
  playerCore.isCore = true;

  return {
    id: "test-codec-session",
    player_id: "test-player",
    session_type: { type: "singleplayer" as const },
    phase: "pre_combat" as const,
    round: 1,
    step: 3,
    seed,
    initial_seed: seed,
    options: [],
    team: { units: [playerCore] },
    wins: 0,
    losses: 0,
    action_log: [],
  };
}
