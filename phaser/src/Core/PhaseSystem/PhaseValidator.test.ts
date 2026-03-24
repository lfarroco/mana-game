/**
 * Comprehensive tests for the PhaseValidator.
 *
 * PhaseValidator enforces phase transition rules and action legality. Tests verify:
 *   - Valid and invalid phase transitions
 *   - Action availability in options
 *   - Phase-specific action restrictions
 *   - Meta and system actions
 *   - Result state consistency
 */
import { describe, expect, it } from "@jest/globals";
import { phaseValidator } from "@Core/PhaseSystem/PhaseValidator";
import { SessionData, PhaseType } from "@Core/Types";
import { PhaseTransitionResult } from "@Core/PhaseSystem/types";

const createSession = (
	overrides: Partial<SessionData> = {},
	optionIds: string[] = []
): SessionData => ({
	id: "sess-1",
	player_id: "player-1",
	phase: "encounter",
	round: 1,
	step: 1,
	seed: "seed-1",
	initial_seed: "seed-1",
	current_options: { options: optionIds.map((id) => ({ id })) },
	team: { units: [] },
	wins: 0,
	losses: 0,
	action_log: [],
	...overrides,
});

const createResult = (overrides: Partial<PhaseTransitionResult> = {}): PhaseTransitionResult => ({
	nextPhase: "shop",
	nextOptions: [],
	stepIncrement: 0,
	roundIncrement: 0,
	...overrides,
});

// ---------------------------------------------------------------------------
// validateTransition() Tests
// ---------------------------------------------------------------------------

describe("PhaseValidator.validateTransition", () => {
	describe("encounter phase", () => {
		it("allows transition to shop", () => {
			const result = phaseValidator.validateTransition("encounter", "shop");
			expect(result.valid).toBe(true);
		});

		it("allows transition to orb_shop", () => {
			const result = phaseValidator.validateTransition("encounter", "orb_shop");
			expect(result.valid).toBe(true);
		});

		it("allows transition to combat", () => {
			const result = phaseValidator.validateTransition("encounter", "combat");
			expect(result.valid).toBe(true);
		});

		it("allows staying in encounter", () => {
			const result = phaseValidator.validateTransition("encounter", "encounter");
			expect(result.valid).toBe(true);
		});

		it("rejects transition to upgrade_core", () => {
			const result = phaseValidator.validateTransition("encounter", "upgrade_core");
			expect(result.valid).toBe(false);
		});

		it("rejects transition to victory", () => {
			const result = phaseValidator.validateTransition("encounter", "victory");
			expect(result.valid).toBe(false);
		});
	});

	describe("shop phase", () => {
		it("allows transition to encounter", () => {
			const result = phaseValidator.validateTransition("shop", "encounter");
			expect(result.valid).toBe(true);
		});

		it("allows transition to combat", () => {
			const result = phaseValidator.validateTransition("shop", "combat");
			expect(result.valid).toBe(true);
		});

		it("allows staying in shop", () => {
			const result = phaseValidator.validateTransition("shop", "shop");
			expect(result.valid).toBe(true);
		});

		it("rejects transition to orb_shop", () => {
			const result = phaseValidator.validateTransition("shop", "orb_shop");
			expect(result.valid).toBe(false);
		});

		it("rejects transition to upgrade_core", () => {
			const result = phaseValidator.validateTransition("shop", "upgrade_core");
			expect(result.valid).toBe(false);
		});
	});

	describe("orb_shop phase", () => {
		it("allows transition to encounter", () => {
			const result = phaseValidator.validateTransition("orb_shop", "encounter");
			expect(result.valid).toBe(true);
		});

		it("allows transition to combat", () => {
			const result = phaseValidator.validateTransition("orb_shop", "combat");
			expect(result.valid).toBe(true);
		});

		it("allows staying in orb_shop", () => {
			const result = phaseValidator.validateTransition("orb_shop", "orb_shop");
			expect(result.valid).toBe(true);
		});

		it("rejects transition to shop", () => {
			const result = phaseValidator.validateTransition("orb_shop", "shop");
			expect(result.valid).toBe(false);
		});
	});

	describe("combat phase", () => {
		it("allows transition to encounter", () => {
			const result = phaseValidator.validateTransition("combat", "encounter");
			expect(result.valid).toBe(true);
		});

		it("allows transition to upgrade_core", () => {
			const result = phaseValidator.validateTransition("combat", "upgrade_core");
			expect(result.valid).toBe(true);
		});

		it("allows transition to add_reaction_core", () => {
			const result = phaseValidator.validateTransition("combat", "add_reaction_core");
			expect(result.valid).toBe(true);
		});

		it("allows transition to victory", () => {
			const result = phaseValidator.validateTransition("combat", "victory");
			expect(result.valid).toBe(true);
		});

		it("allows transition to game_over", () => {
			const result = phaseValidator.validateTransition("combat", "game_over");
			expect(result.valid).toBe(true);
		});

		it("allows staying in combat", () => {
			const result = phaseValidator.validateTransition("combat", "combat");
			expect(result.valid).toBe(true);
		});

		it("rejects transition to shop", () => {
			const result = phaseValidator.validateTransition("combat", "shop");
			expect(result.valid).toBe(false);
		});
	});

	describe("upgrade_core phase", () => {
		it("allows transition to encounter", () => {
			const result = phaseValidator.validateTransition("upgrade_core", "encounter");
			expect(result.valid).toBe(true);
		});

		it("allows staying in upgrade_core", () => {
			const result = phaseValidator.validateTransition("upgrade_core", "upgrade_core");
			expect(result.valid).toBe(true);
		});

		it("rejects transition to shop", () => {
			const result = phaseValidator.validateTransition("upgrade_core", "shop");
			expect(result.valid).toBe(false);
		});

		it("rejects transition to combat", () => {
			const result = phaseValidator.validateTransition("upgrade_core", "combat");
			expect(result.valid).toBe(false);
		});
	});

	describe("add_reaction_core phase", () => {
		it("allows transition to encounter", () => {
			const result = phaseValidator.validateTransition("add_reaction_core", "encounter");
			expect(result.valid).toBe(true);
		});

		it("allows staying in add_reaction_core", () => {
			const result = phaseValidator.validateTransition("add_reaction_core", "add_reaction_core");
			expect(result.valid).toBe(true);
		});

		it("rejects transition to shop", () => {
			const result = phaseValidator.validateTransition("add_reaction_core", "shop");
			expect(result.valid).toBe(false);
		});
	});

	describe("terminal phases", () => {
		it("allows staying in victory (same phase)", () => {
			const result = phaseValidator.validateTransition("victory", "victory");
			expect(result.valid).toBe(true);
		});

		it("rejects transitions to other phases from victory", () => {
			const otherPhases: PhaseType[] = [
				"encounter",
				"shop",
				"orb_shop",
				"combat",
				"upgrade_core",
				"add_reaction_core",
				"game_over",
			];

			otherPhases.forEach((phase) => {
				const result = phaseValidator.validateTransition("victory", phase);
				expect(result.valid).toBe(false);
			});
		});

		it("allows staying in game_over (same phase)", () => {
			const result = phaseValidator.validateTransition("game_over", "game_over");
			expect(result.valid).toBe(true);
		});

		it("rejects transitions to other phases from game_over", () => {
			const otherPhases: PhaseType[] = [
				"encounter",
				"shop",
				"orb_shop",
				"combat",
				"upgrade_core",
				"add_reaction_core",
				"victory",
			];

			otherPhases.forEach((phase) => {
				const result = phaseValidator.validateTransition("game_over", phase);
				expect(result.valid).toBe(false);
			});
		});
	});
});

// ---------------------------------------------------------------------------
// validateAction() Tests
// ---------------------------------------------------------------------------

describe("PhaseValidator.validateAction", () => {
	describe("system actions (hidden actions)", () => {
		it("allows skip_shop in shop phase", () => {
			const session = createSession({ phase: "shop" }, ["unit_a", "unit_b"]);
			const result = phaseValidator.validateAction({ session, actionId: "skip_shop" });
			expect(result.valid).toBe(true);
		});

		it("rejects skip_shop outside shop phase", () => {
			const session = createSession({ phase: "encounter" }, ["assassins_hideout", "armory"]);
			const result = phaseValidator.validateAction({ session, actionId: "skip_shop" });
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("valid for phase 'shop'");
		});

		it("allows skip_encounter in encounter phase", () => {
			const session = createSession({ phase: "encounter" }, ["enc1", "enc2"]);
			const result = phaseValidator.validateAction({ session, actionId: "skip_encounter" });
			expect(result.valid).toBe(true);
		});

		it("rejects skip_encounter outside encounter phase", () => {
			const session = createSession({ phase: "shop" }, ["unit1"]);
			const result = phaseValidator.validateAction({ session, actionId: "skip_encounter" });
			expect(result.valid).toBe(false);
		});

		it("allows combat_done in combat phase", () => {
			const session = createSession({ phase: "combat" });
			const result = phaseValidator.validateAction({ session, actionId: "combat_done" });
			expect(result.valid).toBe(true);
		});

		it("rejects combat_done outside combat phase", () => {
			const session = createSession({ phase: "encounter" });
			const result = phaseValidator.validateAction({ session, actionId: "combat_done" });
			expect(result.valid).toBe(false);
		});

		it("allows victory in combat phase", () => {
			const session = createSession({ phase: "combat" });
			const result = phaseValidator.validateAction({ session, actionId: "victory" });
			expect(result.valid).toBe(true);
		});

		it("allows upgrade_core_done in upgrade_core phase", () => {
			const session = createSession({ phase: "upgrade_core" });
			const result = phaseValidator.validateAction({ session, actionId: "upgrade_core_done" });
			expect(result.valid).toBe(true);
		});

		it("allows add_reaction_core_done in add_reaction_core phase", () => {
			const session = createSession({ phase: "add_reaction_core" });
			const result = phaseValidator.validateAction({ session, actionId: "add_reaction_core_done" });
			expect(result.valid).toBe(true);
		});

		it("allows orb_shop_done in orb_shop phase", () => {
			const session = createSession({ phase: "orb_shop" });
			const result = phaseValidator.validateAction({ session, actionId: "orb_shop_done" });
			expect(result.valid).toBe(true);
		});

		it("allows return_to_menu from any phase", () => {
			const phases: PhaseType[] = [
				"encounter",
				"shop",
				"combat",
				"upgrade_core",
				"victory",
			];

			phases.forEach((phase) => {
				const session = createSession({ phase });
				const result = phaseValidator.validateAction({ session, actionId: "return_to_menu" });
				expect(result.valid).toBe(true);
			});
		});
	});

	describe("meta actions", () => {
		it("allows discard_unit without options check", () => {
			const session = createSession({ phase: "shop" }, ["card_1"]);
			const result = phaseValidator.validateAction({ session, actionId: "discard_unit" });
			expect(result.valid).toBe(true);
		});

		it("allows discard_unit even with no options", () => {
			const session = createSession(
				{ phase: "shop", current_options: undefined },
				[]
			);
			const result = phaseValidator.validateAction({ session, actionId: "discard_unit" });
			expect(result.valid).toBe(true);
		});

		it("allows update_team without options check", () => {
			const session = createSession({ phase: "shop" });
			const result = phaseValidator.validateAction({ session, actionId: "update_team" });
			expect(result.valid).toBe(true);
		});
	});

	describe("option-based actions", () => {
		it("allows an action present in current_options", () => {
			const session = createSession({ phase: "shop" }, ["card_1", "card_2", "card_3"]);
			const result = phaseValidator.validateAction({ session, actionId: "card_2" });
			expect(result.valid).toBe(true);
		});

		it("rejects an action not in current_options", () => {
			const session = createSession({ phase: "shop" }, ["card_1", "card_2"]);
			const result = phaseValidator.validateAction({ session, actionId: "card_3" });
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("not in the current available options");
		});

		it("rejects any action when options is undefined", () => {
			const session = createSession(
				{ phase: "shop", current_options: undefined },
				[]
			);
			const result = phaseValidator.validateAction({ session, actionId: "card_1" });
			expect(result.valid).toBe(false);
		});

		it("rejects any action when options is empty", () => {
			const session = createSession({ phase: "shop" }, []);
			const result = phaseValidator.validateAction({ session, actionId: "any_action" });
			expect(result.valid).toBe(false);
		});

		it("handles options in array format", () => {
			const session = createSession({ phase: "encounter" });
			session.current_options = [{ id: "enc_1" }, { id: "enc_2" }];

			const result = phaseValidator.validateAction({ session, actionId: "enc_1" });
			expect(result.valid).toBe(true);
		});

		it("handles options in object format with options array", () => {
			const session = createSession({ phase: "encounter" });
			session.current_options = { options: [{ id: "enc_1" }, { id: "enc_2" }] };

			const result = phaseValidator.validateAction({ session, actionId: "enc_1" });
			expect(result.valid).toBe(true);
		});
	});

	describe("sub-phase actions", () => {
		it("allows apply_orb without strict options check", () => {
			const session = createSession({ phase: "orb_shop" });
			const result = phaseValidator.validateAction({ session, actionId: "apply_orb" });
			expect(result.valid).toBe(true);
		});
	});
});

// ---------------------------------------------------------------------------
// validateResult() Tests
// ---------------------------------------------------------------------------

describe("PhaseValidator.validateResult", () => {
	describe("valid transitions", () => {
		it("allows transition to allowed next phase", () => {
			const previousSession = createSession({ phase: "encounter" });
			const result = createResult({ nextPhase: "shop" });

			const validation = phaseValidator.validateResult(previousSession, result);
			expect(validation.valid).toBe(true);
		});

		it("allows staying in same phase", () => {
			const previousSession = createSession({ phase: "shop" });
			const result = createResult({ nextPhase: "shop" });

			const validation = phaseValidator.validateResult(previousSession, result);
			expect(validation.valid).toBe(true);
		});

		it("allows multiple valid transitions in sequence", () => {
			const transitions = [
				{ from: "encounter", to: "shop" },
				{ from: "shop", to: "combat" },
				{ from: "combat", to: "upgrade_core" },
				{ from: "upgrade_core", to: "encounter" },
			];

			transitions.forEach(({ from, to }) => {
				const previousSession = createSession({
					phase: from as PhaseType,
				});
				const result = createResult({ nextPhase: to as PhaseType });

				const validation = phaseValidator.validateResult(previousSession, result);
				expect(validation.valid).toBe(true);
			});
		});
	});

	describe("invalid transitions", () => {
		it("rejects invalid transition from shop to upgrade_core", () => {
			const previousSession = createSession({ phase: "shop" });
			const result = createResult({ nextPhase: "upgrade_core" });

			const validation = phaseValidator.validateResult(previousSession, result);
			expect(validation.valid).toBe(false);
		});

		it("rejects transition from encounter to game_over", () => {
			const previousSession = createSession({ phase: "encounter" });
			const result = createResult({ nextPhase: "game_over" });

			const validation = phaseValidator.validateResult(previousSession, result);
			expect(validation.valid).toBe(false);
		});
	});

	describe("step and round validation", () => {
		it("allows positive stepIncrement", () => {
			const previousSession = createSession({ phase: "encounter" });
			const result = createResult({
				nextPhase: "shop",
				stepIncrement: 1,
			});

			const validation = phaseValidator.validateResult(previousSession, result);
			expect(validation.valid).toBe(true);
		});

		it("allows zero stepIncrement", () => {
			const previousSession = createSession({ phase: "shop" });
			const result = createResult({
				nextPhase: "shop",
				stepIncrement: 0,
			});

			const validation = phaseValidator.validateResult(previousSession, result);
			expect(validation.valid).toBe(true);
		});

		it("rejects negative roundIncrement", () => {
			const previousSession = createSession({ phase: "encounter" });
			const result = createResult({
				nextPhase: "shop",
				roundIncrement: -1,
			});

			const validation = phaseValidator.validateResult(previousSession, result);
			expect(validation.valid).toBe(false);
			expect(validation.errors[0]).toContain("Round cannot decrement");
		});

		it("allows large positive roundIncrement", () => {
			const previousSession = createSession({ phase: "encounter" });
			const result = createResult({
				nextPhase: "encounter",
				roundIncrement: 100,
			});

			const validation = phaseValidator.validateResult(previousSession, result);
			expect(validation.valid).toBe(true);
		});

		it("allows zero roundIncrement", () => {
			const previousSession = createSession({ phase: "encounter" });
			const result = createResult({
				nextPhase: "shop",
				roundIncrement: 0,
			});

			const validation = phaseValidator.validateResult(previousSession, result);
			expect(validation.valid).toBe(true);
		});
	});

	describe("special data validation", () => {
		it("allows specialData with any content", () => {
			const previousSession = createSession({ phase: "combat" });
			const result = createResult({
				nextPhase: "upgrade_core",
				specialData: { startCombat: true, outcome: "player_won" },
			});

			const validation = phaseValidator.validateResult(previousSession, result);
			expect(validation.valid).toBe(true);
		});

		it("allows undefined specialData", () => {
			const previousSession = createSession({ phase: "encounter" });
			const result = createResult({ nextPhase: "shop", specialData: undefined });

			const validation = phaseValidator.validateResult(previousSession, result);
			expect(validation.valid).toBe(true);
		});

		it("allows empty specialData object", () => {
			const previousSession = createSession({ phase: "shop" });
			const result = createResult({ nextPhase: "encounter", specialData: {} });

			const validation = phaseValidator.validateResult(previousSession, result);
			expect(validation.valid).toBe(true);
		});
	});

	describe("nextOptions validation", () => {
		it("allows empty nextOptions", () => {
			const previousSession = createSession({ phase: "shop" });
			const result = createResult({
				nextPhase: "encounter",
				nextOptions: [],
			});

			const validation = phaseValidator.validateResult(previousSession, result);
			expect(validation.valid).toBe(true);
		});

		it("allows multiple nextOptions", () => {
			const previousSession = createSession({ phase: "encounter" });
			const result = createResult({
				nextPhase: "shop",
				nextOptions: [
					{ id: "card_1" },
					{ id: "card_2" },
					{ id: "card_3" },
				],
			});

			const validation = phaseValidator.validateResult(previousSession, result);
			expect(validation.valid).toBe(true);
		});
	});
});
