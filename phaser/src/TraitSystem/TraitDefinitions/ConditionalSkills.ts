import { TraitDefinition } from "../TraitEffectSystem";
import { TraitId } from "../Traits";

// these are examples

/**
 * This trait demonstrates how to use conditions to create a unit
 * that uses different skills based on its row position.
 *
 * How it works:
 * - The trait has multiple effects, all triggered by the same event ("onAction").
 * - Each effect corresponds to a different skill (e.g., "skill_melee", "skill_shoot").
 * - Each effect has a condition ("is_in_row") that checks the unit's position.
 * - When the "onAction" event fires, the Trait System evaluates all effects.
 * - Only the effect whose condition is met will execute, effectively "dispatching"
 *   the correct skill for the unit's current row.
 */
export const versatileFighterTrait: TraitDefinition = {
	id: "versatile_fighter" as TraitId,
	name: "Formation Tactics",
	description: "Uses a different skill based on row position. Front: Slash, Mid: Shoot, Back: Heal.",
	categories: ["versatile", "offensive", "support"],
	effects: [
		{
			effectId: "skill_melee",
			eventTrigger: "onAction",
			targetSelector: "self", // Target is determined by the skill logic itself
			conditions: [
				{ type: "is_in_row", row: "front" }
			]
		},
		{
			effectId: "skill_shoot",
			eventTrigger: "onAction",
			targetSelector: "self",
			conditions: [
				{ type: "is_in_row", row: "mid" }
			]
		},
		{
			effectId: "skill_heal",
			eventTrigger: "onAction",
			targetSelector: "self",
			conditions: [
				{ type: "is_in_row", row: "back" }
			]
		}
	]
};

// To use this, you would register it (e.g., in `TraitSystem.initializeTraitsFromData`)
// and then add it to a card's `traits` array in your card definitions JSON, like:
// { "id": "some_card_id", ..., "traits": [{ "id": "versatile_fighter" }] }