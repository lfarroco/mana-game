/**
 * @file Examples of poison trait definitions
 * 
 * This file demonstrates how to create traits that apply poison to enemy forces.
 * These examples show different scenarios and parameter configurations for poison effects.
 */

import { TraitDefinition } from '../TraitSystem/TraitEffectSystem';
import { TraitId } from '../TraitSystem/Traits';

/**
 * Example trait that applies poison when the unit acts
 */
export const venomousTrait: TraitDefinition = {
	id: "venomous" as TraitId,
	name: "Venomous",
	description: "Applies 8 poison to enemy force when this unit acts",
	categories: ["offensive", "poison", "damage"],
	effects: [
		{
			effectId: "apply_poison",
			eventTrigger: "onAction",
			amount: 8
		}
	]
};

/**
 * Example trait that applies poison at battle start
 */
export const toxicAuraTrait: TraitDefinition = {
	id: "toxic_aura" as TraitId,
	name: "Toxic Aura",
	description: "Applies 5 poison to enemy force at the start of battle",
	categories: ["offensive", "poison", "aura"],
	effects: [
		{
			effectId: "apply_poison",
			eventTrigger: "onBattleStart",
			amount: 5
		}
	]
};

/**
 * Example trait with configurable poison amount via trait instance params
 */
export const adaptivePoisonTrait: TraitDefinition = {
	id: "adaptive_poison" as TraitId,
	name: "Adaptive Poison",
	description: "Applies poison (amount varies by card)",
	categories: ["offensive", "poison", "utility"],
	effects: [
		{
			effectId: "apply_poison",
			eventTrigger: "onAction"
			// amount will come from traitInstanceParams when applied to a card
		}
	]
};

/**
 * Example trait that applies poison when this unit is attacked
 */
export const retaliationPoisonTrait: TraitDefinition = {
	id: "retaliation_poison" as TraitId,
	name: "Retaliation Poison",
	description: "Applies 6 poison to enemy force when this unit is attacked",
	categories: ["defensive", "poison", "retaliation"],
	effects: [
		{
			effectId: "apply_poison",
			eventTrigger: "onAttackByEnemy",
			amount: 6
		}
	]
};

/**
 * Example card using the poison traits
 */
export const poisonMageCardExample = {
	id: "poison_mage",
	name: "Poison Mage",
	description: "A sinister spellcaster who corrupts enemy forces with toxic magic",
	pic: "poison_mage.png",
	hp: 60,
	maxHp: 60,
	power: 12,
	cooldown: 1800,
	crit: 5,
	evade: 0,
	traits: [
		{
			id: "venomous" as TraitId,
			amount: 10 // Custom poison amount for this specific card
		}
	]
};

/**
 * Example card with multiple poison effects
 */
export const venomLordCardExample = {
	id: "venom_lord",
	name: "Venom Lord",
	description: "The master of toxic arts, spreading poison with every breath",
	pic: "venom_lord.png",
	hp: 80,
	maxHp: 80,
	power: 15,
	cooldown: 2200,
	crit: 0,
	evade: 10,
	traits: [
		{
			id: "toxic_aura" as TraitId,
			amount: 8 // Custom poison amount for battle start
		},
		{
			id: "retaliation_poison" as TraitId,
			amount: 4 // Poison when attacked
		}
	]
};

/**
 * Integration Examples:
 * 
 * 1. Basic Poison Application:
 *    - Trait: "venomous" applies poison when unit acts
 *    - The poison amount can be customized per card through trait instance params
 * 
 * 2. Battle Start Poison:
 *    - Trait: "toxic_aura" applies poison at battle start
 *    - Good for area denial or battlefield control effects
 * 
 * 3. Defensive Poison:
 *    - Trait: "retaliation_poison" applies poison when attacked
 *    - Discourages enemies from targeting this unit
 * 
 * 4. Parameter Configuration:
 *    - amount: Number of initial poison damage (default: 10)
 *    - Can be specified in effect definition or trait instance params
 *    - Effect instance params take priority over trait instance params
 * 
 * 5. Integration:
 *    - Works with existing poison damage system that decreases damage each tick
 *    - Compatible with all event triggers (onAction, onBattleStart, etc.)
 *    - Automatically shows poison visual effects and damage application
 */
