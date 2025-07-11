/**
 * @file Example of using the addShield trait effect
 * This shows how to create cards/units that can add shield to their force
 */

import { TraitDefinition } from '../TraitSystem/TraitEffectSystem';
import { TraitId } from '../TraitSystem/Traits';

/**
 * Example trait that adds 25 shield to the unit's force when the unit acts
 */
export const shieldGeneratorTrait: TraitDefinition = {
	id: "shield_generator" as TraitId,
	name: "Shield Generator",
	description: "Generates 25 shield for your force when this unit acts",
	categories: ["defensive", "utility"],
	effects: [
		{
			effectId: "add_shield",
			eventTrigger: "onAction",
			amount: 25
		}
	]
};

/**
 * Example trait that adds a large amount of shield at battle start
 */
export const battleshieldTrait: TraitDefinition = {
	id: "battleshield" as TraitId,
	name: "Battleshield",
	description: "Grants 50 shield to your force at the start of battle",
	categories: ["defensive"],
	effects: [
		{
			effectId: "add_shield",
			eventTrigger: "onBattleStart",
			amount: 50
		}
	]
};

/**
 * Example trait with configurable shield amount via trait instance params
 */
export const configurableShieldTrait: TraitDefinition = {
	id: "configurable_shield" as TraitId,
	name: "Flexible Shield",
	description: "Grants shield (amount varies by card)",
	categories: ["defensive", "utility"],
	effects: [
		{
			effectId: "add_shield",
			eventTrigger: "onAction"
			// amount will come from traitInstanceParams when applied to a card
		}
	]
};

/**
 * Example card using the shield traits
 */
export const shieldBearerCardExample = {
	id: "shield_bearer",
	name: "Shield Bearer",
	description: "A defensive unit that generates shield for your force",
	pic: "shield_bearer.png",
	hp: 80,
	maxHp: 80,
	power: 15,
	attackType: "damage" as const,
	cooldown: 1200,
	traits: [
		{
			// Uses the shield generator trait with default amount (25)
			traitDef: shieldGeneratorTrait,
			id: shieldGeneratorTrait.id
		},
		{
			// Uses configurable shield trait with custom amount
			traitDef: configurableShieldTrait,
			id: configurableShieldTrait.id,
			amount: 15 // This unit generates 15 additional shield
		}
	]
};

/**
 * Usage notes:
 * 
 * 1. Shield System Rules:
 *    - Shield starts at 0 when battle begins
 *    - Shield can exceed morale value (no cap)
 *    - Shield additions are cumulative (additive)
 *    - Damage hits shield first, then morale
 *    - Shield bar display uses morale as the scale (shield >= morale shows full bar)
 * 
 * 2. Event Flow:
 *    - addShield effect emits UNIT_SHIELD_GAINED event
 *    - manipulateForceShield function emits SHIELD_UPDATED event
 *    - ShieldDisplay component updates the visual bar
 * 
 * 3. Parameters:
 *    - amount: Number of shield points to add (default: 10)
 *    - Can be specified in effect definition or trait instance params
 *    - Effect instance params take priority over trait instance params
 * 
 * 4. Integration:
 *    - Works with existing shield damage absorption system
 *    - Compatible with all event triggers (onAction, onBattleStart, etc.)
 *    - Automatically shows/updates shield bars in UI
 */
