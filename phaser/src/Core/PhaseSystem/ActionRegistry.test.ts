/**
 * Comprehensive tests for the ActionRegistry.
 *
 * The ActionRegistry maintains metadata about all actions in the game,
 * including their type, target phase, and other properties. Tests verify:
 *   - Retrieving action metadata
 *   - Registering new actions
 *   - Classifying actions by type
 *   - Resetting to default state
 *   - Fallback behavior for unknown actions
 */
import { describe, expect, it, beforeEach } from "@jest/globals";
import { actionRegistry } from "./ActionRegistry";
import { ActionType } from "./types";

describe("ActionRegistry", () => {
	beforeEach(() => {
		// Reset to initial state before each test
		actionRegistry.reset();
	});

	// ---------------------------------------------------------------------------
	// get() Tests
	// ---------------------------------------------------------------------------

	describe("get", () => {
		it("returns metadata for a known action", () => {
			const meta = actionRegistry.get("skip_shop");
			expect(meta).toBeDefined();
			expect(meta?.type).toBe(ActionType.PHASE_SKIP);
			expect(meta?.fromPhase).toBe("shop");
		});

		it("returns undefined for an unknown action", () => {
			const meta = actionRegistry.get("non_existent_action");
			expect(meta).toBeUndefined();
		});

		it("returns metadata with description for documented actions", () => {
			const meta = actionRegistry.get("skip_shop");
			expect(meta?.description).toBeDefined();
			expect(typeof meta?.description).toBe("string");
		});

		it("returns complete metadata for transitions with fromPhase and toPhase", () => {
			const meta = actionRegistry.get("upgrade_unit");
			expect(meta?.type).toBe(ActionType.PHASE_TRANSITION);
			expect(meta?.toPhase).toBe("orb_shop");
		});

		it("returns metadata correctly for combat actions", () => {
			const meta = actionRegistry.get("combat_done");
			expect(meta?.fromPhase).toBe("combat");
			expect(meta?.description).toBeDefined();
		});

		it("returns metadata for all core phase transitions", () => {
			const transitions = [
				"skip_encounter",
				"combat_encounter",
				"skip_shop",
				"combat_done",
				"upgrade_core_done",
				"add_reaction_core_done",
			];

			transitions.forEach((actionId) => {
				const meta = actionRegistry.get(actionId);
				expect(meta).toBeDefined();
				expect(meta?.type).toMatch(
					/phase_transition|phase_skip/
				);
			});
		});

		it("returns metadata for all orb upgrade actions", () => {
			const orbActions = [
				"increase_core_max_life",
				"upgrade_core_power",
				"decrease_core_cooldown",
			];

			orbActions.forEach((actionId) => {
				const meta = actionRegistry.get(actionId);
				expect(meta?.fromPhase).toBe("upgrade_core");
			});
		});

		it("returns metadata for all reaction core actions", () => {
			const reactionActions = [
				"on_100_damage_effect",
				"on_ally_death_effect",
				"on_crit_effect",
				"on_battle_start_effect",
			];

			reactionActions.forEach((actionId) => {
				const meta = actionRegistry.get(actionId);
				expect(meta?.fromPhase).toBe("add_reaction_core");
			});
		});
	});

	// ---------------------------------------------------------------------------
	// getActionType() Tests
	// ---------------------------------------------------------------------------

	describe("getActionType", () => {
		it("returns correct type for a known action", () => {
			const type = actionRegistry.getActionType("skip_shop");
			expect(type).toBe(ActionType.PHASE_SKIP);
		});

		it("returns PHASE_TRANSITION as default for unknown actions", () => {
			// Unknown actions (like card IDs) are assumed to be phase transitions
			const type = actionRegistry.getActionType("card_id_12345");
			expect(type).toBe(ActionType.PHASE_TRANSITION);
		});

		it("identifies META_ACTION type correctly", () => {
			const type = actionRegistry.getActionType("discard_unit");
			expect(type).toBe(ActionType.META_ACTION);
		});

		it("identifies SUB_PHASE action type correctly", () => {
			const type = actionRegistry.getActionType("apply_orb");
			expect(type).toBe(ActionType.SUB_PHASE);
		});

		it("identifies PHASE_TRANSITION type correctly", () => {
			const type = actionRegistry.getActionType("combat_encounter");
			expect(type).toBe(ActionType.PHASE_TRANSITION);
		});

		it("returns consistent types for all meta actions", () => {
			const metaActions = ["discard_unit", "update_team"];
			metaActions.forEach((actionId) => {
				expect(actionRegistry.getActionType(actionId)).toBe(ActionType.META_ACTION);
			});
		});
	});

	// ---------------------------------------------------------------------------
	// isMetaAction() Tests
	// ---------------------------------------------------------------------------

	describe("isMetaAction", () => {
		it("returns true for discard_unit", () => {
			expect(actionRegistry.isMetaAction("discard_unit")).toBe(true);
		});

		it("returns true for update_team", () => {
			expect(actionRegistry.isMetaAction("update_team")).toBe(true);
		});

		it("returns false for phase transitions", () => {
			expect(actionRegistry.isMetaAction("skip_shop")).toBe(false);
			expect(actionRegistry.isMetaAction("combat_done")).toBe(false);
		});

		it("returns false for sub-phase actions", () => {
			expect(actionRegistry.isMetaAction("apply_orb")).toBe(false);
		});

		it("returns false for unknown actions", () => {
			expect(actionRegistry.isMetaAction("unknown_action")).toBe(false);
		});
	});

	// ---------------------------------------------------------------------------
	// isSubPhaseAction() Tests
	// ---------------------------------------------------------------------------

	describe("isSubPhaseAction", () => {
		it("returns true for apply_orb", () => {
			expect(actionRegistry.isSubPhaseAction("apply_orb")).toBe(true);
		});

		it("returns false for phase transitions", () => {
			expect(actionRegistry.isSubPhaseAction("skip_shop")).toBe(false);
			expect(actionRegistry.isSubPhaseAction("combat_done")).toBe(false);
		});

		it("returns false for meta actions", () => {
			expect(actionRegistry.isSubPhaseAction("discard_unit")).toBe(false);
			expect(actionRegistry.isSubPhaseAction("update_team")).toBe(false);
		});

		it("returns false for unknown actions", () => {
			expect(actionRegistry.isSubPhaseAction("unknown_action")).toBe(false);
		});
	});

	// ---------------------------------------------------------------------------
	// register() Tests
	// ---------------------------------------------------------------------------

	describe("register", () => {
		it("registers a new action with metadata", () => {
			const meta = {
				type: ActionType.PHASE_TRANSITION,
				fromPhase: "encounter" as const,
				toPhase: "shop" as const,
				description: "Test action",
			};

			actionRegistry.register("test_action", meta);

			const retrieved = actionRegistry.get("test_action");
			expect(retrieved).toEqual(meta);
		});

		it("overwrites existing action metadata when registering", () => {
			const newMeta = {
				type: ActionType.META_ACTION,
				description: "Updated action",
			};

			actionRegistry.register("skip_shop", newMeta);

			const retrieved = actionRegistry.get("skip_shop");
			expect(retrieved?.type).toBe(ActionType.META_ACTION);
			expect(retrieved?.description).toBe("Updated action");
		});

		it("allows registering multiple actions in sequence", () => {
			actionRegistry.register("custom_1", {
				type: ActionType.PHASE_TRANSITION,
				description: "Custom 1",
			});

			actionRegistry.register("custom_2", {
				type: ActionType.PHASE_SKIP,
				description: "Custom 2",
			});

			expect(actionRegistry.get("custom_1")?.type).toBe(ActionType.PHASE_TRANSITION);
			expect(actionRegistry.get("custom_2")?.type).toBe(ActionType.PHASE_SKIP);
		});

		it("persists registrations across get calls", () => {
			actionRegistry.register("persistent_action", {
				type: ActionType.META_ACTION,
			});

			const first = actionRegistry.get("persistent_action");
			const second = actionRegistry.get("persistent_action");

			expect(first).toEqual(second);
			expect(first?.type).toBe(ActionType.META_ACTION);
		});
	});

	// ---------------------------------------------------------------------------
	// reset() Tests
	// ---------------------------------------------------------------------------

	describe("reset", () => {
		it("restores the registry to initial state after custom registration", () => {
			actionRegistry.register("custom_action", {
				type: ActionType.PHASE_TRANSITION,
			});

			expect(actionRegistry.get("custom_action")).toBeDefined();

			actionRegistry.reset();

			expect(actionRegistry.get("custom_action")).toBeUndefined();
		});

		it("preserves all default actions after reset", () => {
			actionRegistry.register("custom", { type: ActionType.META_ACTION });
			actionRegistry.reset();

			expect(actionRegistry.get("skip_shop")).toBeDefined();
			expect(actionRegistry.get("combat_done")).toBeDefined();
			expect(actionRegistry.get("discard_unit")).toBeDefined();
		});

		it("removes modifications to existing actions after reset", () => {
			const original = actionRegistry.get("skip_shop");
			actionRegistry.register("skip_shop", { type: ActionType.META_ACTION });

			const modified = actionRegistry.get("skip_shop");
			expect(modified?.type).not.toBe(original?.type);

			actionRegistry.reset();

			const restored = actionRegistry.get("skip_shop");
			expect(restored).toEqual(original);
		});

		it("can resync with game actions multiple times", () => {
			// Register custom
			actionRegistry.register("temp", { type: ActionType.PHASE_TRANSITION });
			expect(actionRegistry.get("temp")).toBeDefined();

			// Reset
			actionRegistry.reset();
			expect(actionRegistry.get("temp")).toBeUndefined();

			// Register again
			actionRegistry.register("temp", { type: ActionType.META_ACTION });
			expect(actionRegistry.get("temp")?.type).toBe(ActionType.META_ACTION);

			// Reset again
			actionRegistry.reset();
			expect(actionRegistry.get("temp")).toBeUndefined();
		});
	});

	// ---------------------------------------------------------------------------
	// Integration Tests
	// ---------------------------------------------------------------------------

	describe("integration", () => {
		it("supports complex workflow: register, query, modify, reset", () => {
			// 1. Query default state
			expect(actionRegistry.isMetaAction("discard_unit")).toBe(true);

			// 2. Register new action
			actionRegistry.register("new_action", {
				type: ActionType.PHASE_TRANSITION,
				fromPhase: "shop",
				toPhase: "encounter",
			});

			expect(actionRegistry.get("new_action")).toBeDefined();

			// 3. Modify existing action
			actionRegistry.register("skip_shop", {
				type: ActionType.META_ACTION,
			});

			expect(actionRegistry.getActionType("skip_shop")).toBe(ActionType.META_ACTION);

			// 4. Reset
			actionRegistry.reset();

			expect(actionRegistry.get("new_action")).toBeUndefined();
			expect(actionRegistry.getActionType("skip_shop")).toBe(ActionType.PHASE_SKIP);
		});

		it("maintains consistency between get and type checking methods", () => {
			const actions = [
				"skip_shop",
				"discard_unit",
				"apply_orb",
				"combat_done",
			];

			actions.forEach((actionId) => {
				const meta = actionRegistry.get(actionId);
				const type = actionRegistry.getActionType(actionId);

				expect(type).toBe(meta?.type);
			});
		});

		it("handles all known actions without errors", () => {
			const knownActions = [
				// Meta
				"discard_unit",
				"update_team",
				// Phase skips
				"skip_encounter",
				"skip_shop",
				// Orb shop
				"upgrade_unit",
				"power_distributor",
				"power_absorber",
				"apply_orb",
				"orb_shop_done",
				// Combat
				"combat_encounter",
				"combat_done",
				"victory",
				// Upgrades
				"upgrade_core_done",
				"increase_core_max_life",
				"upgrade_core_power",
				"decrease_core_cooldown",
				// Reactions
				"add_reaction_core_done",
				"on_100_damage_effect",
				"on_ally_death_effect",
				"on_crit_effect",
				"on_battle_start_effect",
				// Other
				"phase_complete",
				"return_to_menu",
			];

			knownActions.forEach((actionId) => {
				expect(() => {
					actionRegistry.get(actionId);
					actionRegistry.getActionType(actionId);
					actionRegistry.isMetaAction(actionId);
					actionRegistry.isSubPhaseAction(actionId);
				}).not.toThrow();
			});
		});
	});
});
