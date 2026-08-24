/**
 * Tests for SessionTransitions — session state machine.
 *
 * Covers the full start_combat → end_combat flow, including the
 * critical wonCombat derivation (P0 bug fix).
 */
/// <reference types="jest" />

import * as Card from "../Entities/Card";
import * as Constants from "../math/Constants";
import * as Models from "../Models";
import * as SessionTransitions from "./SessionTransitions";
import * as CoreUpgradeOrbs from "../content/coreUpgradeOrbs";
import { RANDOM_ORB_POOL } from "../Orbs/OrbDefinitions";

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

    it("advances to the upgrade_core phase after round-1 combat (step accounting fix)", () => {
      const session = createTestSession("test-upgrade-flow-001");
      makeCoreStrong(session);

      // Round 1 rotation: encounter(0) encounter(1) encounter(2) pre_combat(3)
      // combat(4) upgrade_core(5). Combat must advance the step so end_combat
      // resolves to upgrade_core instead of re-reading "combat".
      const afterCombat = SessionTransitions.transitionToNextState(session, {
        type: "start_combat",
      });
      expect(afterCombat.session.phase).toBe("combat");
      expect(afterCombat.session.step).toBe(4);

      const afterEnd = SessionTransitions.transitionToNextState(
        afterCombat.session,
        { type: "end_combat" },
      );
      expect(afterEnd.session.phase).toBe("upgrade_core");
      expect(afterEnd.session.step).toBe(5);
      // The options are the themed core upgrades (CUB-B2), not the old static
      // stat-only list.
      expect(afterEnd.session.options.map((o) => o.id)).toEqual(
        SessionTransitions.generateCoreUpgradeOptions(afterEnd.session).map(
          (o) => o.id,
        ),
      );
      expect(afterEnd.session.options).toHaveLength(3);
    });

    it("rolls over to round-2 encounters after the upgrade_core phase", () => {
      const session = createTestSession("test-round-rollover-001");
      makeCoreStrong(session);

      const afterCombat = SessionTransitions.transitionToNextState(session, {
        type: "start_combat",
      });
      const afterUpgrade = SessionTransitions.transitionToNextState(
        afterCombat.session,
        { type: "end_combat" },
      );
      expect(afterUpgrade.session.phase).toBe("upgrade_core");

      // The rotation has no step-6 phase: skip must roll to round 2, step 0.
      const afterSkip = SessionTransitions.transitionToNextState(
        afterUpgrade.session,
        { type: "skip" },
      );
      expect(afterSkip.session.phase).toBe("encounter");
      expect(afterSkip.session.round).toBe(2);
      expect(afterSkip.session.step).toBe(0);
    });

    it("advances to the add_reaction_core phase after round-2 combat", () => {
      const session = createTestSession("test-add-reaction-flow-001");
      makeCoreStrong(session);

      // Drive round 1 fully (encounters → combat → upgrade_core → skip rolls
      // to round 2).
      const r1Combat = SessionTransitions.transitionToNextState(session, {
        type: "start_combat",
      });
      const r1Upgrade = SessionTransitions.transitionToNextState(
        r1Combat.session,
        { type: "end_combat" },
      );
      const r2Start = SessionTransitions.transitionToNextState(
        r1Upgrade.session,
        { type: "skip" },
      );
      expect(r2Start.session.phase).toBe("encounter");
      expect(r2Start.session.round).toBe(2);

      // Round 2 rotation: encounter(0-2) pre_combat(3) combat(4) add_reaction_core(5).
      const r2AfterEncounters = SessionTransitions.transitionToNextState(
        r2Start.session,
        { type: "skip" },
      );
      const r2PreCombat = SessionTransitions.transitionToNextState(
        r2AfterEncounters.session,
        { type: "skip" },
      );
      const r2PreCombatFinal = SessionTransitions.transitionToNextState(
        r2PreCombat.session,
        { type: "skip" },
      );
      expect(r2PreCombatFinal.session.phase).toBe("pre_combat");
      expect(r2PreCombatFinal.session.step).toBe(3);

      const r2Combat = SessionTransitions.transitionToNextState(
        r2PreCombatFinal.session,
        { type: "start_combat" },
      );
      expect(r2Combat.session.phase).toBe("combat");
      expect(r2Combat.session.step).toBe(4);

      const r2AfterEnd = SessionTransitions.transitionToNextState(
        r2Combat.session,
        { type: "end_combat" },
      );
      expect(r2AfterEnd.session.phase).toBe("add_reaction_core");
      expect(r2AfterEnd.session.step).toBe(5);
    });

    it("applies a picked themed orb via select_encounter and advances the run (CUB-B3)", () => {
      const session = createTestSession("test-core-upgrade-apply-001");
      makeCoreStrong(session);

      const afterCombat = SessionTransitions.transitionToNextState(session, {
        type: "start_combat",
      });
      const afterUpgrade = SessionTransitions.transitionToNextState(
        afterCombat.session,
        { type: "end_combat" },
      );
      expect(afterUpgrade.session.phase).toBe("upgrade_core");

      // critical_crystal is a damage-theme core; crit_crit_column is a
      // damage-theme identity orb. Picking it must append the effect to the
      // core and advance the run into round 2.
      const critColumn =
        CoreUpgradeOrbs.CORE_UPGRADE_DEFINITIONS.crit_crit_column;
      const afterPick = SessionTransitions.transitionToNextState(
        afterUpgrade.session,
        { type: "select_encounter", encounterId: critColumn.id },
      );

      expect(afterPick.session.phase).toBe("encounter");
      expect(afterPick.session.round).toBe(2);
      expect(afterPick.session.step).toBe(0);

      const core = afterPick.session.team.units.find((u) => u.isCore)!;
      expect(
        core.effects.some(
          (effect) =>
            JSON.stringify(effect) === JSON.stringify(critColumn.effect),
        ),
      ).toBe(true);
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

    it("is theme-scoped for the overflow theme — radiant_crystal returns only overflow identity or the 3 stat ids (CUB-G1)", () => {
      const session = createTestSession(
        "cub-b1-overflow-scoping",
        "radiant_crystal",
      );
      const overflowIdentityIds = Object.values(
        CoreUpgradeOrbs.CORE_UPGRADE_DEFINITIONS,
      )
        .filter((def) => def.theme === "overflow")
        .map((def) => def.id);
      const overflowPoolIds = new Set([...overflowIdentityIds, ...STAT_IDS]);

      const options = SessionTransitions.generateCoreUpgradeOptions(session);

      expect(options).toHaveLength(3);
      for (const option of options) {
        expect(overflowPoolIds.has(option.id)).toBe(true);
      }
    });

    it("is theme-scoped for the thorns theme — verdant_crystal returns only thorns identity or the 3 stat ids (CUB-G2)", () => {
      const session = createTestSession(
        "cub-b1-thorns-scoping",
        "verdant_crystal",
      );
      const thornsIdentityIds = Object.values(
        CoreUpgradeOrbs.CORE_UPGRADE_DEFINITIONS,
      )
        .filter((def) => def.theme === "thorns")
        .map((def) => def.id);
      const thornsPoolIds = new Set([...thornsIdentityIds, ...STAT_IDS]);

      const options = SessionTransitions.generateCoreUpgradeOptions(session);

      expect(options).toHaveLength(3);
      for (const option of options) {
        expect(thornsPoolIds.has(option.id)).toBe(true);
      }
    });

    it("is theme-scoped for the void theme — void_crystal returns only void identity or the 3 stat ids (CUB-G3)", () => {
      const session = createTestSession("cub-b1-void-scoping", "void_crystal");
      const voidIdentityIds = Object.values(
        CoreUpgradeOrbs.CORE_UPGRADE_DEFINITIONS,
      )
        .filter((def) => def.theme === "void")
        .map((def) => def.id);
      const voidPoolIds = new Set([...voidIdentityIds, ...STAT_IDS]);

      const options = SessionTransitions.generateCoreUpgradeOptions(session);

      expect(options).toHaveLength(3);
      for (const option of options) {
        expect(voidPoolIds.has(option.id)).toBe(true);
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

  describe("oracles_riddle (A9)", () => {
    it("instantly recruits a random bronze into a free slot and advances", () => {
      const session = createTestSession("a9-recruit");
      const before = session.team.units.length; // 1 (the core)

      const result = SessionTransitions.transitionToNextState(session, {
        type: "select_encounter",
        encounterId: "oracles_riddle",
      });

      const team = result.session.team.units;
      expect(team.length).toBe(before + 1);
      const recruited = team.find((u) => !u.isCore)!;
      const card = Card.getNonCores().find((c) => c.id === recruited.cardId)!;
      expect(card.rank ?? 1).toBe(1);
      // The recruit lands on a free board slot (no overlap with the core).
      const positions = team.map((u) => `${u.position[0]},${u.position[1]}`);
      expect(new Set(positions).size).toBe(team.length);
    });

    it("is deterministic under the session seed", () => {
      const a = SessionTransitions.transitionToNextState(
        createTestSession("a9-determinism"),
        { type: "select_encounter", encounterId: "oracles_riddle" },
      );
      const b = SessionTransitions.transitionToNextState(
        createTestSession("a9-determinism"),
        { type: "select_encounter", encounterId: "oracles_riddle" },
      );
      expect(a.session.team.units.map((u) => u.cardId)).toEqual(
        b.session.team.units.map((u) => u.cardId),
      );
    });
  });

  describe("chaos_altar (A10)", () => {
    const coreIdOf = (seed: string): string =>
      createTestSession(seed).team.units[0].id;

    it("applies a seeded random orb from the registered pool when the marker is dropped", () => {
      const session = createTestSession("a10-apply");
      const result = SessionTransitions.transitionToNextState(session, {
        type: "apply_orb",
        orbId: "chaos_altar_random_orb",
        targetUnitId: coreIdOf("a10-apply"),
      });

      // The altar consumed the seeded RNG (the session seed advanced past the
      // pool draw) and the orb_shop phase was left behind.
      expect(result.session.seed).not.toBe("a10-apply");
      expect(result.session.phase).not.toBe("orb_shop");
    });

    it("is deterministic under the session seed", () => {
      const run = (seed: string) =>
        SessionTransitions.transitionToNextState(createTestSession(seed), {
          type: "apply_orb",
          orbId: "chaos_altar_random_orb",
          targetUnitId: coreIdOf(seed),
        });
      const a = run("a10-determinism");
      const b = run("a10-determinism");
      expect(a.session.seed).toBe(b.session.seed);
      // Unit ids are UUIDs (never equal across runs) — compare the stable
      // game-state fields instead.
      const stable = (units: typeof a.session.team.units) =>
        units.map((u) => ({
          cardId: u.cardId,
          rank: u.rank,
          power: u.power,
          effects: u.effects,
          reactions: u.reactions,
        }));
      expect(stable(a.session.team.units)).toEqual(
        stable(b.session.team.units),
      );
    });

    it("every pool orb applies cleanly through apply_orb (no throw, phase advances)", () => {
      for (const orbId of RANDOM_ORB_POOL) {
        const session = createTestSession(`a10-pool-${orbId}`);
        const result = SessionTransitions.transitionToNextState(session, {
          type: "apply_orb",
          orbId,
          targetUnitId: coreIdOf(`a10-pool-${orbId}`),
        });
        expect(result.session.phase).not.toBe("orb_shop");
      }
    });
  });

  describe("roulette_wheel (A11)", () => {
    const WHEEL_RESULTS = new Set([
      "roulette_gold_shop",
      "roulette_core_power",
      "roulette_core_reaction",
      "roulette_upgrade_orb",
    ]);

    const spin = (seed: string, losses = 1) => {
      const session = createTestSession(seed);
      session.losses = losses;
      return SessionTransitions.transitionToNextState(session, {
        type: "select_encounter",
        encounterId: "roulette_wheel",
      });
    };

    it("rejects the spin when paying 1 life would reach game over", () => {
      const result = spin("a11-guard", Constants.LOSSES_TO_GAME_OVER - 1);
      expect(result.session.losses).toBe(Constants.LOSSES_TO_GAME_OVER - 1);
      expect(result.session.phase).toBe("pre_combat"); // untouched
    });

    it("charges 1 life and reveals 3 distinct reward encounters", () => {
      const result = spin("a11-pay");
      expect(result.session.losses).toBeGreaterThanOrEqual(2);
      // The wheel never lands on a dead outcome anymore — 3 rewards are always
      // revealed as cards for the player to pick one from.
      expect(result.session.phase).toBe("encounter");
      const ids = result.session.options.map((o) => o.id);
      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3); // distinct
      for (const id of ids) {
        expect(WHEEL_RESULTS.has(id)).toBe(true);
      }
      expect(result.session.seed).not.toBe("a11-pay");
    });

    it("is deterministic under the session seed", () => {
      const a = spin("a11-det");
      const b = spin("a11-det");
      expect(a.session.seed).toBe(b.session.seed);
      expect(a.session.losses).toBe(b.session.losses);
      expect(a.session.options.map((o) => o.id)).toEqual(
        b.session.options.map((o) => o.id),
      );
    });

    it("never offers the wheel at game-over risk (guard caps the life loss)", () => {
      // Spinning always charges exactly 1 life and never reaches
      // LOSSES_TO_GAME_OVER from the near-death guard.
      for (let i = 0; i < 60; i++) {
        const result = spin(`a11-cap-${i}`, 2);
        expect(result.session.losses).toBe(3);
        expect(result.session.losses).toBeLessThan(
          Constants.LOSSES_TO_GAME_OVER,
        );
      }
    });

    it("can reveal every wheel result across seeds", () => {
      const seen = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const result = spin(`a11-cover-${i}`);
        const ids = result.session.options.map((o) => o.id);
        expect(ids).toHaveLength(3);
        expect(new Set(ids).size).toBe(3); // distinct
        for (const id of ids) seen.add(id);
      }
      expect(seen).toEqual(WHEEL_RESULTS);
    });

    it("excludes roulette_core_reaction when the core already carries every identity reaction", () => {
      const session = createTestSession("a11-all-reactions");
      const core = session.team.units[0];
      core.reactions = Object.values(CoreUpgradeOrbs.CORE_UPGRADE_DEFINITIONS)
        .filter((def) => def.kind === "reaction" && def.reaction)
        .map((def) => structuredClone(def.reaction!));

      const result = SessionTransitions.transitionToNextState(session, {
        type: "select_encounter",
        encounterId: "roulette_wheel",
      });

      // The reaction forge would be a dead slot — every other reward is shown.
      expect(result.session.options.map((o) => o.id)).not.toContain(
        "roulette_core_reaction",
      );
      expect(new Set(result.session.options.map((o) => o.id))).toEqual(
        new Set([
          "roulette_gold_shop",
          "roulette_core_power",
          "roulette_upgrade_orb",
        ]),
      );
    });
  });

  describe("roulette wheel results (A11 redesign)", () => {
    const resolve = (resultId: string, seed = "a11-resolve") =>
      SessionTransitions.transitionToNextState(createTestSession(seed), {
        type: "select_encounter",
        encounterId: resultId,
      });

    it("roulette_gold_shop routes to a 3-option gold shop", () => {
      const result = resolve("roulette_gold_shop");
      expect(result.session.phase).toBe("shop");
      expect(result.session.options).toHaveLength(3);
      for (const opt of result.session.options) {
        const card = Card.getNonCores().find((c) => c.id === opt.id);
        expect(card!.rank).toBe(3);
      }
    });

    it("roulette_core_power grants +50 permanent power to the core", () => {
      const session = createTestSession("a11-power");
      const beforePower = session.team.units[0].power;
      const beforeBonus = session.team.units[0].bonusPower;
      const result = SessionTransitions.transitionToNextState(session, {
        type: "select_encounter",
        encounterId: "roulette_core_power",
      });
      const afterCore = result.session.team.units[0];
      expect(afterCore.power).toBe(beforePower + 50);
      expect(afterCore.bonusPower).toBe(beforeBonus + 50);
      expect(result.session.phase).not.toBe("encounter");
    });

    it("roulette_core_reaction appends a random identity reaction to the core", () => {
      const session = createTestSession("a11-reaction");
      const reactionsBefore = session.team.units[0].reactions.length;
      const result = SessionTransitions.transitionToNextState(session, {
        type: "select_encounter",
        encounterId: "roulette_core_reaction",
      });
      const afterCore = result.session.team.units[0];
      expect(afterCore.reactions.length).toBe(reactionsBefore + 1);
      const poolReactions = Object.values(
        CoreUpgradeOrbs.CORE_UPGRADE_DEFINITIONS,
      )
        .filter((def) => def.kind === "reaction" && def.reaction)
        .map((def) => JSON.stringify(def.reaction));
      expect(
        poolReactions.includes(
          JSON.stringify(afterCore.reactions[afterCore.reactions.length - 1]),
        ),
      ).toBe(true);
      expect(result.session.phase).not.toBe("encounter");
    });

    it("roulette_upgrade_orb routes to orb_shop with the upgrade orb", () => {
      const result = resolve("roulette_upgrade_orb");
      expect(result.session.phase).toBe("orb_shop");
      expect(result.session.options.map((o) => o.id)).toEqual(["upgrade_orb"]);
    });
  });
});

/**
 * Create a minimal test session in pre_combat phase with a basic core.
 * @param coreCardId the player's core card (defaults to critical_crystal).
 */
function createTestSession(
  seed: string,
  coreCardId: string = "critical_crystal",
): Models.SessionData {
  const playerCore = Card.makeUnit(
    Constants.FORCE_ID_PLAYER,
    coreCardId,
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
