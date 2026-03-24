/**
 * Comprehensive unit tests for all phase handlers.
 *
 * Each handler receives a PhaseTransitionContext and returns a PhaseTransitionResult.
 * Tests verify:
 *   - Correct next phase for each valid action
 *   - Correct stepIncrement / roundIncrement
 *   - Options passed through or generated as expected
 *   - Invalid actions are rejected (throw)
 */
import { describe, expect, it } from "@jest/globals";

import { encounterPhaseHandler } from "./EncounterPhaseHandler";
import { shopPhaseHandler } from "./ShopPhaseHandler";
import { combatPhaseHandler } from "./CombatPhaseHandler";
import { orbShopPhaseHandler } from "./OrbShopPhaseHandler";
import { upgradeCorePhaseHandler } from "./UpgradeCorePhaseHandler";
import { addReactionCorePhaseHandler } from "./AddReactionCorePhaseHandler";
import { metaActionHandler } from "./MetaActionHandler";

import { SessionData, PhaseOption } from "@Core/Types";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const makeOptions = (...ids: string[]): { options: PhaseOption[] } => ({
	options: ids.map((id) => ({ id })),
});

const createSession = (overrides: Partial<SessionData> = {}): SessionData => ({
	id: "sess-test",
	player_id: "player-1",
	phase: "encounter",
	round: 1,
	step: 1,
	seed: "test-seed-abc",
	initial_seed: "test-seed-abc",
	current_options: { options: [] },
	team: { units: [] },
	wins: 0,
	losses: 0,
	action_log: [],
	...overrides,
});

// ---------------------------------------------------------------------------
// EncounterPhaseHandler
// ---------------------------------------------------------------------------

describe("EncounterPhaseHandler", () => {
	it("transitions to shop on skip_encounter", () => {
		const session = createSession();
		const result = encounterPhaseHandler.transition({ session, actionId: "skip_encounter" });

		expect(result.nextPhase).toBe("shop");
		expect(result.stepIncrement).toBe(0);
		expect(Array.isArray(result.nextOptions)).toBe(true);
	});

	it("transitions to shop when selecting a regular encounter", () => {
		const session = createSession({ current_options: makeOptions("assassins_hideout") });
		const result = encounterPhaseHandler.transition({
			session,
			actionId: "assassins_hideout",
		});

		expect(result.nextPhase).toBe("shop");
		expect(Array.isArray(result.nextOptions)).toBe(true);
	});

	it("transitions to combat on combat_encounter", () => {
		const session = createSession({ current_options: makeOptions("combat_encounter") });
		const result = encounterPhaseHandler.transition({ session, actionId: "combat_encounter" });

		expect(result.nextPhase).toBe("combat");
		expect(result.specialData).toMatchObject({ startCombat: true });
	});

	it("transitions to orb_shop with upgrade_orb on upgrade_unit", () => {
		const session = createSession({ current_options: makeOptions("upgrade_unit") });
		const result = encounterPhaseHandler.transition({ session, actionId: "upgrade_unit" });

		expect(result.nextPhase).toBe("orb_shop");
		expect(result.nextOptions).toEqual([{ id: "upgrade_orb" }]);
		expect(result.stepIncrement).toBe(0);
	});

	it("transitions to orb_shop with distribute_power_orb on power_distributor", () => {
		const session = createSession({ current_options: makeOptions("power_distributor") });
		const result = encounterPhaseHandler.transition({ session, actionId: "power_distributor" });

		expect(result.nextPhase).toBe("orb_shop");
		expect(result.nextOptions).toEqual([{ id: "distribute_power_orb" }]);
	});

	it("transitions to orb_shop with absorb_power_orb on power_absorber", () => {
		const session = createSession({ current_options: makeOptions("power_absorber") });
		const result = encounterPhaseHandler.transition({ session, actionId: "power_absorber" });

		expect(result.nextPhase).toBe("orb_shop");
		expect(result.nextOptions).toEqual([{ id: "absorb_power_orb" }]);
	});
});

// ---------------------------------------------------------------------------
// ShopPhaseHandler
// ---------------------------------------------------------------------------

describe("ShopPhaseHandler", () => {
	it("transitions to encounter on skip_shop when next step is an encounter", () => {
		// Round 1, step 1 → step+1=2 = 'encounter' in ROUND_PHASES[1]
		const session = createSession({ phase: "shop", step: 1 });
		const result = shopPhaseHandler.transition({ session, actionId: "skip_shop" });

		expect(result.nextPhase).toBe("encounter");
		expect(result.stepIncrement).toBe(1);
	});

	it("transitions to encounter with combat_encounter option when step 3 is complete", () => {
		// Round 1, step 3 → step+1=4 = 'combat' in ROUND_PHASES[1] → shopHandler sets encounter+combat_encounter
		const session = createSession({ phase: "shop", step: 3 });
		const result = shopPhaseHandler.transition({ session, actionId: "skip_shop" });

		expect(result.nextPhase).toBe("encounter");
		expect(result.nextOptions).toContainEqual({ id: "combat_encounter" });
		expect(result.stepIncrement).toBe(1);
	});

	it("generates different options for different seeds", () => {
		const session1 = createSession({ phase: "shop", step: 1, seed: "seed-alpha" });
		const session2 = createSession({ phase: "shop", step: 1, seed: "seed-beta" });

		const result1 = shopPhaseHandler.transition({ session: session1, actionId: "skip_shop" });
		const result2 = shopPhaseHandler.transition({ session: session2, actionId: "skip_shop" });

		// With different seeds the generated encounter options are almost certainly different
		// (not a strict requirement but verifies the seed is wired up)
		expect(result1.nextOptions).not.toEqual(result2.nextOptions);
	});
});

// ---------------------------------------------------------------------------
// CombatPhaseHandler
// ---------------------------------------------------------------------------

describe("CombatPhaseHandler", () => {
	it("transitions to upgrade_core at step 5 after combat_done (round 1)", () => {
		// Round 1, step 4: next step = 5 = 'upgrade_core'
		const session = createSession({ phase: "combat", step: 4, round: 1 });
		const result = combatPhaseHandler.transition({ session, actionId: "combat_done" });

		expect(result.nextPhase).toBe("upgrade_core");
		expect(result.nextOptions).toBeDefined();
		expect(result.nextOptions.length).toBeGreaterThan(0);
	});

	it("transitions to add_reaction_core at step 5 after combat_done (round 2)", () => {
		// Round 2, step 4: next step = 5 = 'add_reaction_core'
		const session = createSession({ phase: "combat", step: 4, round: 2 });
		const result = combatPhaseHandler.transition({ session, actionId: "combat_done" });

		expect(result.nextPhase).toBe("add_reaction_core");
		expect(result.nextOptions).toBeDefined();
		expect(result.nextOptions.length).toBeGreaterThan(0);
	});

	it("starts a new encounter round when no upgrade phase follows (hypothetical config)", () => {
		// Using round 16+, which falls back to DEFAULT_ROUND_PHASES where step 5 = upgrade_core.
		// To test the new-round branch, choose a round where step+1 falls outside the config.
		// At round 15 step 1: step+1=2='encounter' → takes the else branch (new round).
		const session = createSession({ phase: "combat", step: 1, round: 15 });
		// NOTE: step+1=2 which is 'encounter' → goes to new round with encounter
		const result = combatPhaseHandler.transition({ session, actionId: "combat_done" });

		expect(result.nextPhase).toBe("encounter");
		expect(result.roundIncrement).toBe(1);
		expect(result.stepIncrement).toBeDefined();
	});

	it("transitions to victory when wins reach 10 and action is combat_done", () => {
		const session = createSession({ phase: "combat", step: 4, wins: 10 });
		const result = combatPhaseHandler.transition({ session, actionId: "combat_done" });

		expect(result.nextPhase).toBe("victory");
		expect(result.nextOptions.some((o) => o.id === "victory")).toBe(true);
		expect(result.nextOptions.some((o) => o.id === "return_to_menu")).toBe(true);
	});

	it("transitions to game_over when losses reach 4", () => {
		const session = createSession({ phase: "combat", step: 4, losses: 4 });
		const result = combatPhaseHandler.transition({ session, actionId: "combat_done" });

		expect(result.nextPhase).toBe("game_over");
		expect(result.nextOptions.some((o) => o.id === "return_to_menu")).toBe(true);
	});

	it("losses check takes priority over the step-based upgrade path", () => {
		// Even at the upgrade step (step 4→5), losses ≥ 4 means game_over
		const session = createSession({ phase: "combat", step: 4, round: 1, losses: 4 });
		const result = combatPhaseHandler.transition({ session, actionId: "combat_done" });

		expect(result.nextPhase).toBe("game_over");
	});

	it("continues the game (endless mode) when 'victory' action is sent from combat, not routing to victory phase", () => {
		// The 'victory' action from combat is the legacy/endless-mode continuation signal.
		// Unlike 'combat_done' with wins >= 10 (which routes to the victory screen),
		// 'victory' falls through to normal step progression and continues to the next round.
		const session = createSession({ phase: "combat", step: 1, round: 1, wins: 10 });
		const result = combatPhaseHandler.transition({ session, actionId: "victory" });

		expect(result.nextPhase).not.toBe("victory");
		expect(result.nextPhase).not.toBe("game_over");
	});

	it("throws on unexpected action", () => {
		const session = createSession({ phase: "combat", step: 4 });

		expect(() =>
			combatPhaseHandler.transition({ session, actionId: "unknown_combat_action" })
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// OrbShopPhaseHandler
// ---------------------------------------------------------------------------

describe("OrbShopPhaseHandler", () => {
	it("stays in orb_shop on apply_orb (stepIncrement = 0)", () => {
		const session = createSession({
			phase: "orb_shop",
			current_options: makeOptions("upgrade_orb"),
		});
		const result = orbShopPhaseHandler.transition({
			session,
			actionId: "apply_orb",
			payload: { orbId: "upgrade_orb", unitId: "unit-1" },
		});

		expect(result.nextPhase).toBe("orb_shop");
		expect(result.stepIncrement).toBe(0);
	});

	it("preserves the current options when applying an orb", () => {
		const session = createSession({
			phase: "orb_shop",
			current_options: makeOptions("upgrade_orb", "power_orb"),
		});
		const result = orbShopPhaseHandler.transition({ session, actionId: "apply_orb" });

		expect(result.nextOptions).toEqual(
			expect.arrayContaining([{ id: "upgrade_orb" }, { id: "power_orb" }])
		);
	});

	it("transitions to encounter on orb_shop_done (next step is encounter)", () => {
		// Round 1, step 1 → step+1=2 = encounter
		const session = createSession({ phase: "orb_shop", step: 1, round: 1 });
		const result = orbShopPhaseHandler.transition({ session, actionId: "orb_shop_done" });

		expect(result.nextPhase).toBe("encounter");
		expect(result.stepIncrement).toBe(1);
	});

	it("transitions to encounter with combat_encounter on orb_shop_done when next step is combat", () => {
		// Round 1, step 3 → step+1=4 = combat → encounter with combat_encounter option
		const session = createSession({ phase: "orb_shop", step: 3, round: 1 });
		const result = orbShopPhaseHandler.transition({ session, actionId: "orb_shop_done" });

		expect(result.nextPhase).toBe("encounter");
		expect(result.nextOptions).toContainEqual({ id: "combat_encounter" });
	});

	it("throws on unexpected action", () => {
		const session = createSession({ phase: "orb_shop" });

		expect(() =>
			orbShopPhaseHandler.transition({ session, actionId: "invalid_orb_action" })
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// UpgradeCorePhaseHandler
// ---------------------------------------------------------------------------

describe("UpgradeCorePhaseHandler", () => {
	const upgradeOptions = makeOptions(
		"increase_core_max_life",
		"upgrade_core_power",
		"decrease_core_cooldown"
	);

	it.each(["increase_core_max_life", "upgrade_core_power", "decrease_core_cooldown"])(
		"stays in upgrade_core and preserves options on %s",
		(actionId) => {
			const session = createSession({
				phase: "upgrade_core",
				step: 5,
				current_options: upgradeOptions,
			});
			const result = upgradeCorePhaseHandler.transition({ session, actionId });

			expect(result.nextPhase).toBe("upgrade_core");
			expect(result.stepIncrement).toBe(0);
			// Options should be passed through unchanged
			expect(result.nextOptions).toEqual(
				expect.arrayContaining([
					{ id: "increase_core_max_life" },
					{ id: "upgrade_core_power" },
					{ id: "decrease_core_cooldown" },
				])
			);
		}
	);

	it("transitions to encounter at new round on upgrade_core_done", () => {
		const session = createSession({ phase: "upgrade_core", step: 5, round: 1 });
		const result = upgradeCorePhaseHandler.transition({
			session,
			actionId: "upgrade_core_done",
		});

		expect(result.nextPhase).toBe("encounter");
		expect(result.roundIncrement).toBe(1);
		// stepIncrement should reset step to 1: step + stepIncrement = 1
		expect(session.step + (result.stepIncrement ?? 0)).toBe(1);
		expect(Array.isArray(result.nextOptions)).toBe(true);
		expect(result.nextOptions.length).toBeGreaterThan(0);
	});

	it("generates encounter options for the next round, not current", () => {
		// round 1 step 5 → upgrade_core_done → roundIncrement=1, nextRound=2 → encounters for round 2
		const session = createSession({ phase: "upgrade_core", step: 5, round: 1 });
		const result = upgradeCorePhaseHandler.transition({ session, actionId: "upgrade_core_done" });

		// The next round is 2 and encounter options should be generated for it
		expect(result.nextOptions.length).toBeGreaterThan(0);
		// Options should not include upgrade-core specific actions
		const upgradeActionIds = ["increase_core_max_life", "upgrade_core_power", "decrease_core_cooldown"];
		result.nextOptions.forEach((opt) => {
			expect(upgradeActionIds).not.toContain(opt.id);
		});
	});

	it("throws on unexpected action", () => {
		const session = createSession({ phase: "upgrade_core" });

		expect(() =>
			upgradeCorePhaseHandler.transition({ session, actionId: "skip_shop" })
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// AddReactionCorePhaseHandler
// ---------------------------------------------------------------------------

describe("AddReactionCorePhaseHandler", () => {
	const reactionOptions = makeOptions(
		"on_100_damage_effect",
		"on_ally_death_effect",
		"on_crit_effect",
		"on_battle_start_effect"
	);

	it.each([
		"on_100_damage_effect",
		"on_ally_death_effect",
		"on_crit_effect",
		"on_battle_start_effect",
	])("stays in add_reaction_core and preserves options on %s", (actionId) => {
		const session = createSession({
			phase: "add_reaction_core",
			step: 5,
			current_options: reactionOptions,
		});
		const result = addReactionCorePhaseHandler.transition({ session, actionId });

		expect(result.nextPhase).toBe("add_reaction_core");
		expect(result.stepIncrement).toBe(0);
		expect(result.nextOptions).toEqual(
			expect.arrayContaining([
				{ id: "on_100_damage_effect" },
				{ id: "on_ally_death_effect" },
				{ id: "on_crit_effect" },
				{ id: "on_battle_start_effect" },
			])
		);
	});

	it("transitions to encounter at new round on add_reaction_core_done", () => {
		const session = createSession({ phase: "add_reaction_core", step: 5, round: 2 });
		const result = addReactionCorePhaseHandler.transition({
			session,
			actionId: "add_reaction_core_done",
		});

		expect(result.nextPhase).toBe("encounter");
		expect(result.roundIncrement).toBe(1);
		// step + stepIncrement should equal 1 (step resets to 1)
		expect(session.step + (result.stepIncrement ?? 0)).toBe(1);
		expect(Array.isArray(result.nextOptions)).toBe(true);
		expect(result.nextOptions.length).toBeGreaterThan(0);
	});

	it("throws on unexpected action", () => {
		const session = createSession({ phase: "add_reaction_core" });

		expect(() =>
			addReactionCorePhaseHandler.transition({ session, actionId: "combat_done" })
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// MetaActionHandler
// ---------------------------------------------------------------------------

describe("MetaActionHandler", () => {
	it("stays in encounter phase on discard_unit (stepIncrement = 0)", () => {
		const session = createSession({
			phase: "encounter",
			current_options: makeOptions("some_encounter"),
		});
		const result = metaActionHandler.transition({ session, actionId: "discard_unit" });

		expect(result.nextPhase).toBe("encounter");
		expect(result.stepIncrement).toBe(0);
		expect(result.roundIncrement).toBe(0);
	});

	it("stays in shop phase on update_team", () => {
		const session = createSession({ phase: "shop", current_options: makeOptions() });
		const result = metaActionHandler.transition({ session, actionId: "update_team" });

		expect(result.nextPhase).toBe("shop");
		expect(result.stepIncrement).toBe(0);
	});

	it("preserves current options on discard_unit", () => {
		const session = createSession({
			phase: "encounter",
			current_options: makeOptions("encounter_a", "encounter_b"),
		});
		const result = metaActionHandler.transition({ session, actionId: "discard_unit" });

		expect(result.nextOptions).toEqual(
			expect.arrayContaining([{ id: "encounter_a" }, { id: "encounter_b" }])
		);
	});

	it("returns empty options array when session has no current options", () => {
		const session = createSession({
			phase: "encounter",
			current_options: null,
		});
		const result = metaActionHandler.transition({ session, actionId: "discard_unit" });

		expect(result.nextOptions).toEqual([]);
	});
});
