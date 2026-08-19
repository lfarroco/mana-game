/**
 * Tests for SessionTransitions — session state machine.
 *
 * Covers the full start_combat → end_combat flow, including the
 * critical wonCombat derivation (P0 bug fix).
 */
/// <reference types="jest" />

import * as Card from "../Entities/Card";
import * as Constants from "../math/Constants";
import * as SessionTransitions from "./SessionTransitions";
import * as CoreUpgradeOrbs from "../content/coreUpgradeOrbs";

// Cards are statically available — no registration needed.

afterAll(() => {
  Card.resetCardsMap();
});

describe("SessionTransitions", () => {
  describe("full combat flow (start_combat → end_combat)", () => {
    it("records a win when the player wins the combat", () => {
      const session = createTestSession(
        "z" /* seed that reliably produces a win with a strong core */,
      );
      // Give the player a very strong core that wins against round 1 enemies
      makeCoreStrong(session);

      // Phase 1: start_combat triggers combat simulation
      const afterCombat = SessionTransitions.transitionToNextState(session, {
        type: "start_combat",
      });

      expect(afterCombat.session.phase).toBe("combat");
      expect(afterCombat.combatState).toBeDefined();
      expect(afterCombat.combatState!.wonCombat).toBe(true);

      // Phase 2: end_combat consumes the result
      const afterEnd = SessionTransitions.transitionToNextState(
        afterCombat.session,
        { type: "end_combat" },
      );

      expect(afterEnd.session.wins).toBe(1);
      expect(afterEnd.session.losses).toBe(0);
    });

    it("records a loss when the player loses the combat", () => {
      const session = createTestSession("test-loss-001");
      // Give the player a very weak core that loses quickly
      makeCoreWeak(session);

      const afterCombat = SessionTransitions.transitionToNextState(session, {
        type: "start_combat",
      });

      expect(afterCombat.session.phase).toBe("combat");
      expect(afterCombat.combatState).toBeDefined();
      expect(afterCombat.combatState!.wonCombat).toBe(false);

      const afterEnd = SessionTransitions.transitionToNextState(
        afterCombat.session,
        { type: "end_combat" },
      );

      expect(afterEnd.session.wins).toBe(0);
      expect(afterEnd.session.losses).toBe(1);
    });

    it("throws end_combat if start_combat was not called first", () => {
      const session = createTestSession("test-no-start-001");
      // No pendingCombatState — calling end_combat directly should fail
      expect(() =>
        SessionTransitions.transitionToNextState(session, {
          type: "end_combat",
        }),
      ).toThrow("Missing combat state");
    });
  });

  describe("transitionToNextState with options", () => {
    it("uses enemyTeam override when provided", () => {
      const session = createTestSession("test-enemy-override-001");
      makeCoreStrong(session);

      // Create a custom enemy team with a known unit
      const customEnemy = Card.makeUnit(
        Constants.FORCE_ID_CPU,
        "critical_crystal",
        [3, 1],
      );
      customEnemy.life = 1; // weak — player will win
      customEnemy.maxLife = 1;
      customEnemy.power = 1;

      const result = SessionTransitions.transitionToNextState(
        session,
        { type: "start_combat" },
        { enemyTeam: [customEnemy], enemyPlayerName: "TestOpponent" },
      );

      expect(result.session.phase).toBe("combat");
      expect(result.combatState).toBeDefined();
      expect(result.combatState!.enemyPlayerName).toBe("TestOpponent");
      // The custom enemy should be in the combat state
      const cpuUnits = result.combatState!.units.filter(
        (u) => u.force === Constants.FORCE_ID_CPU,
      );
      expect(cpuUnits).toHaveLength(1);
      expect(cpuUnits[0].id).toBe(customEnemy.id);
    });

    it("defaults enemyPlayerName to CPU when not provided", () => {
      const session = createTestSession("test-default-name-001");
      makeCoreStrong(session);

      const customEnemy = Card.makeUnit(
        Constants.FORCE_ID_CPU,
        "critical_crystal",
        [3, 1],
      );

      const result = SessionTransitions.transitionToNextState(
        session,
        { type: "start_combat" },
        { enemyTeam: [customEnemy] },
      );

      expect(result.combatState!.enemyPlayerName).toBe("CPU");
    });

    it("single-player start_combat still works (no options)", () => {
      const session = createTestSession("test-sp-start-001");
      makeCoreStrong(session);

      const result = SessionTransitions.transitionToNextState(session, {
        type: "start_combat",
      });

      expect(result.session.phase).toBe("combat");
      expect(result.combatState).toBeDefined();
      expect(result.combatState!.enemyPlayerName).toBe("CPU");
    });

    it("single-player start_combat ignores empty options", () => {
      const session = createTestSession("test-sp-no-override-001");
      makeCoreStrong(session);

      const result = SessionTransitions.transitionToNextState(
        session,
        { type: "start_combat" },
        {},
      );

      expect(result.session.phase).toBe("combat");
      expect(result.combatState).toBeDefined();
    });
  });

  describe("transitionToNextState", () => {
    it("throws for unknown action types", () => {
      const session = createTestSession("test-unknown-001");
      expect(() =>
        SessionTransitions.transitionToNextState(session, {
          type: "unknown" as never,
        }),
      ).toThrow("No transition handler");
    });
  });

  describe("generateCoreUpgradeOptions (CUB-B1)", () => {
    const STAT_IDS = [...CoreUpgradeOrbs.CORE_STAT_ORBS];

    const damageIdentityIds = Object.values(
      CoreUpgradeOrbs.CORE_UPGRADE_DEFINITIONS,
    )
      .filter((def) => def.theme === "damage")
      .map((def) => def.id);
    const damagePoolIds = new Set([...damageIdentityIds, ...STAT_IDS]);

    it("is deterministic — same session twice gives identical ids", () => {
      const session = createTestSession("cub-b1-determinism");

      const first = SessionTransitions.generateCoreUpgradeOptions(session);
      const second = SessionTransitions.generateCoreUpgradeOptions(session);

      expect(first.map((o) => o.id)).toEqual(second.map((o) => o.id));
      expect(first).toHaveLength(3);
    });

    it("is theme-scoped — critical_crystal returns only damage identity or the 3 stat ids", () => {
      const session = createTestSession("cub-b1-theme-scoping");

      const options = SessionTransitions.generateCoreUpgradeOptions(session);

      expect(options).toHaveLength(3);
      for (const option of options) {
        expect(damagePoolIds.has(option.id)).toBe(true);
      }
    });

    it("dedupes applied identity orbs — crit_row_power never appears once its reaction is on the core", () => {
      const session = createTestSession("cub-b1-dedupe");
      const core = session.team.units.find((u) => u.isCore)!;
      const critRowPower =
        CoreUpgradeOrbs.CORE_UPGRADE_DEFINITIONS.crit_row_power;
      expect(critRowPower.reaction).toBeDefined();
      core.reactions.push(structuredClone(critRowPower.reaction!));

      const options = SessionTransitions.generateCoreUpgradeOptions(session);

      expect(options.some((o) => o.id === "crit_row_power")).toBe(false);
      // Stat orbs stay repeatable, so a full slate is still offered.
      expect(options).toHaveLength(3);
    });

    it("isOrbEligibleForRound honors minRound", () => {
      const minRoundOrb: CoreUpgradeOrbs.CoreUpgradeDefinition = {
        id: "test_min_round_orb",
        theme: "damage",
        kind: "stat",
        stat: "upgrade_core_power",
        minRound: 4,
      };

      expect(SessionTransitions.isOrbEligibleForRound(minRoundOrb, 3)).toBe(
        false,
      );
      expect(SessionTransitions.isOrbEligibleForRound(minRoundOrb, 4)).toBe(
        true,
      );
    });

    it("falls back to exactly the 3 stat ids when the session has no core", () => {
      const session = createTestSession("cub-b1-no-core");
      session.team.units = [];

      const options = SessionTransitions.generateCoreUpgradeOptions(session);

      expect(options.map((o) => o.id)).toEqual(STAT_IDS);
    });
  });
});

/**
 * Create a minimal test session in pre_combat phase with a basic core.
 */
function createTestSession(seed: string) {
  const playerCore = Card.makeUnit(
    Constants.FORCE_ID_PLAYER,
    "critical_crystal",
    [1, 1],
  );

  return {
    id: "test-session-transitions",
    player_id: "test-player",
    phase: "pre_combat" as const,
    session_type: { type: "singleplayer" as const },
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

/**
 * Boost the core to be near-invincible (survives any round 1 enemy).
 */
function makeCoreStrong(session: ReturnType<typeof createTestSession>): void {
  const core = session.team.units[0];
  core.life = 5000;
  core.maxLife = 5000;
  core.power = 100;
  core.cooldown = 1000;
  core.charge = 0;
  core.refresh = 0;
}

/**
 * Make the core fragile (dies quickly to any enemy).
 */
function makeCoreWeak(session: ReturnType<typeof createTestSession>): void {
  const core = session.team.units[0];
  core.life = 1;
  core.maxLife = 1;
  core.power = 10;
  core.cooldown = 99999;
  core.charge = 0;
  core.refresh = 99999;
}
