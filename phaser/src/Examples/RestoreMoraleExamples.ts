/**
 * @file Examples of restore morale trait definitions
 * 
 * This file demonstrates how to create traits that restore morale to the unit's force.
 * These examples show different scenarios and parameter configurations.
 */

import { TraitDefinition } from '../TraitSystem/TraitEffectSystem';
import { TraitId } from '../TraitSystem/Traits';

/**
 * Example trait that restores 30 morale to the unit's force when the unit acts
 */
export const healerTrait: TraitDefinition = {
	id: "healer" as TraitId,
	name: "Healer",
	description: "Restores 30 morale to your force when this unit acts",
	categories: ["support", "healing"],
	effects: [
		{
			effectId: "restore_morale",
			eventTrigger: "onAction",
			amount: 30
		}
	]
};

/**
 * Example trait that provides a large morale boost at battle start
 */
export const battleMedicTrait: TraitDefinition = {
	id: "battle_medic" as TraitId,
	name: "Battle Medic",
	description: "Restores 75 morale to your force at the start of battle",
	categories: ["support", "healing"],
	effects: [
		{
			effectId: "restore_morale",
			eventTrigger: "onBattleStart",
			amount: 75
		}
	]
};

/**
 * Example trait that restores morale when allies are attacked
 */
export const supportiveTrait: TraitDefinition = {
	id: "supportive_presence" as TraitId,
	name: "Supportive Presence",
	description: "Restores 20 morale to your force when an ally is attacked",
	categories: ["support", "reactive"],
	effects: [
		{
			effectId: "restore_morale",
			eventTrigger: "onAlliedAction",
			amount: 20
		}
	]
};

/**
 * Example trait with configurable heal amount via trait instance params
 */
export const variableHealerTrait: TraitDefinition = {
	id: "variable_healer" as TraitId,
	name: "Adaptive Healer",
	description: "Restores morale (amount varies by card)",
	categories: ["support", "healing"],
	effects: [
		{
			effectId: "restore_morale",
			eventTrigger: "onAction"
			// amount will come from traitInstanceParams when applied to a card
		}
	]
};

/**
 * Example trait that provides emergency healing when morale is low
 */
export const emergencyHealerTrait: TraitDefinition = {
	id: "emergency_healer" as TraitId,
	name: "Emergency Healer",
	description: "Restores 50 morale when your force morale drops below 25%",
	categories: ["support", "conditional"],
	effects: [
		{
			effectId: "restore_morale",
			eventTrigger: "onTurnStart", // Would need custom condition checking
			amount: 50
		}
	]
};

/**
 * Example of how to use the restore morale trait in card data:
 * 
 * {
 *   "id": "cleric",
 *   "name": "Village Cleric",
 *   "hp": 80,
 *   "power": 15,
 *   "traits": [
 *     {
 *       "id": "healer",
 *       "amount": 25  // Optional: overrides the default from trait definition
 *     }
 *   ]
 * }
 * 
 * Or with variable healing:
 * 
 * {
 *   "id": "high_priest",
 *   "name": "High Priest",
 *   "hp": 120,
 *   "power": 10,
 *   "traits": [
 *     {
 *       "id": "variable_healer",
 *       "amount": 60  // Custom heal amount for this specific card
 *     }
 *   ]
 * }
 */

export const restoreMoraleExampleUsage = {
	// Standard healer with fixed amount
	basicHealer: {
		effectId: "restore_morale",
		eventTrigger: "onAction",
		amount: 25
	},

	// Battle start boost
	battleStartHeal: {
		effectId: "restore_morale",
		eventTrigger: "onBattleStart",
		amount: 50
	},

	// Variable amount (from trait instance params)
	variableHeal: {
		effectId: "restore_morale",
		eventTrigger: "onAction"
		// amount comes from traitInstanceParams
	},

	// Small frequent healing
	continuousHealing: {
		effectId: "restore_morale",
		eventTrigger: "onTurnStart",
		amount: 10
	}
};
