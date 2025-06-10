// traits are a way to add special abilities or characteristics to cards
// feature like "taunt", "flying", "trample", etc.

import { pickRandom } from "../utils";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../Scenes/Battleground/constants";
import { State } from "./State";
import { Unit } from "./Unit";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene"; // Ensure BattlegroundSceneType for type annotation
import * as UnitEvents_ from "./UnitEvents"; // Adjusted imports
import {
	TraitDefinition,
	TraitEffectContext,
	getTraitDefinition,
	getTraitEffectImplementation,
	resolveTargets,
	checkConditions,
	registerTraitDefinition as registerNewTraitDefinition // Alias to avoid conflict if any
} from "./TraitEffectSystem";

// The global scene and state are problematic. Effects should get these via TraitEffectContext.
// export let scene: BattlegroundScene;
// export let state: State;

// export const initTraits = (sceneRef: BattlegroundScene, stateRef: State) => {
// 	scene = sceneRef;
// 	state = stateRef;
// }

export type TraitId = string & { __traitId: never };
export type TraitCategory = string & { __traitCategory: never };

export const LINES: {
	[force: string]: {
		FRONT: number;
		MIDDLE: number;
		BACK: number;
	}
} = {
	[FORCE_ID_PLAYER]: {
		FRONT: 4,
		MIDDLE: 5,
		BACK: 6,
	},
	[FORCE_ID_CPU]: {
		FRONT: 1,
		MIDDLE: 2,
		BACK: 3,
	}
}

export const isInFrontline = (unit: Unit): boolean => {
	const frontline = LINES[unit.force].FRONT;
	return unit.position.y === frontline;
}
export const isInMiddleline = (unit: Unit): boolean => {
	const middleline = LINES[unit.force].MIDDLE;
	return unit.position.y === middleline;
}
export const isInBackline = (unit: Unit): boolean => {
	const backline = LINES[unit.force].BACK;
	return unit.position.y === backline;
}

export const TRAIT_CATEGORY_PERSONALITY = "personality" as TraitCategory;
export const TRAIT_CATEGORY_OFFENSIVE = "offensive" as TraitCategory;
export const TRAIT_CATEGORY_SUPPORT = "support" as TraitCategory;
export const TRAIT_CATEGORY_DEFENSIVE = "defensive" as TraitCategory;
export const TRAIT_CATEGORY_ECONOMY = "economy" as TraitCategory;
export const TRAIT_CATEGORY_TRIBE = "tribe" as TraitCategory;
export const TRAIT_CATEGORY_COMPANION = "companion" as TraitCategory;
export const TRAIT_CATEGORY_VISION = "vision" as TraitCategory;
export const TRAIT_CATEGORY_HP = "hp" as TraitCategory;
export const TRAIT_CATEGORY_ATTACK = "attack" as TraitCategory;
export type TraitData = { // This is an *instance* of a trait on a unit/relic
	id: TraitId;
	[key: string]: any;
};

export const randomCategoryTrait = (category: TraitCategory): TraitDefinition | undefined => {
	// This will now use the new traitDefinitionRegistry from TraitEffectSystem
	const allDefs = Array.from(getTraitDefinition(undefined as any) ? [getTraitDefinition(undefined as any)] : []); // Placeholder
	// Correct way: import getAllTraitDefinitions from TraitEffectSystem
	// const allDefs = getAllTraitDefinitions();
	const traitsInCategory = allDefs.filter(t => t!.categories.includes(category));
	if (traitsInCategory.length === 0) {
		throw new Error(`No traits found for category ${category}`);
	}
	const [randomTrait] = pickRandom(traitsInCategory, 1)
	return randomTrait;
};

async function processTraitEvent(
	sourceUnit: Unit,
	traitInstanceData: TraitData, // This is the { id, ...params } from unit.traits
	eventKey: string,
	scene: BattlegroundScene,
	state: State,
	// Optional context parameters
	primaryTarget?: Unit,
	attackDamage?: number,
	isCritical?: boolean,
	evaded?: boolean
) {
	const definition = getTraitDefinition(traitInstanceData.id);
	if (!definition) {
		// console.warn(`Trait definition not found for ID: ${traitInstanceData.id}`);
		return;
	}

	for (const effectInstance of definition.effects) {
		if (effectInstance.eventTrigger === eventKey) {
			const targets = resolveTargets(sourceUnit, effectInstance.targetSelector, state, scene, primaryTarget);

			const context: TraitEffectContext = {
				sourceUnit,
				targets,
				effectInstance, // from TraitDefinition
				traitInstanceParams: traitInstanceData, // from Unit.traits or Relic.traits
				scene,
				state,
				primaryTarget,
				attackDamage,
				isCritical,
				evaded,
			};

			if (!checkConditions(context, effectInstance.conditions)) {
				continue; // Conditions not met for this effect
			}

			const implementation = getTraitEffectImplementation(effectInstance.effectId);
			if (implementation) {
				try {
					await implementation(context);
				} catch (error) {
					console.error(`Error executing trait effect ${effectInstance.effectId} for trait ${definition.id}:`, error);
				}
			} else {
				console.warn(`Implementation not found for effectId: ${effectInstance.effectId} in trait ${definition.id}`);
			}
		}
	}
}

export const runUnitEventTraits = (eventKey: UnitEvents_.UnitEventKeys, scene: BattlegroundScene, state: State) => async (unit: Unit) => {
	for (const traitData of unit.traits) {
		await processTraitEvent(unit, traitData, eventKey, scene, state);
	}
};

export const runAttackEventTraits = (eventKey: UnitEvents_.AttackEventKeys, scene: BattlegroundScene, state: State, target: Unit, damage: number, isCritical: boolean, evaded: boolean) => async (unit: Unit) => {
	for (const traitData of unit.traits) {
		await processTraitEvent(unit, traitData, eventKey, scene, state, target, damage, isCritical, evaded);
	}
};

export const runUnitEventWithTargetTraits = (eventKey: UnitEvents_.UnitEventWithTargetKeys, scene: BattlegroundScene, state: State, target: Unit) => async (unit: Unit) => {
	for (const traitData of unit.traits) {
		await processTraitEvent(unit, traitData, eventKey, scene, state, target);
	}
};

// For global events like "onBattleStart", "onRoundStart"
// These might be triggered differently, perhaps by iterating over all units with relevant traits,
// or by iterating over active relics.
export async function runGlobalEventTraits(
	eventKey: string, // e.g., "onBattleStart"
	scene: BattlegroundScene,
	state: State,
	// forceId?: string // Optional: to target effects for a specific force (e.g. player relics)
) {
	// Example: Iterate over all units for traits that trigger on this global event
	for (const unit of state.battleData.units) {
		for (const traitData of unit.traits) {
			// Here, primaryTarget might be undefined or could be the unit itself if the effect is self-targeted
			await processTraitEvent(unit, traitData, eventKey, scene, state, unit);
		}
	}

	// Example: Iterate over player relics for traits that trigger on this global event
	// (Assuming playerForce is accessible and has relics with TraitData)
	// for (const relic of state.gameData.player.relics) { // Assuming Relic type has a 'traits: TraitData[]'
	//   for (const traitData of relic.traits) {
	//      // sourceUnit for relic effects could be a conceptual "player" or null,
	//      // or effects might not need a sourceUnit if they are purely global.
	//      // For now, let's assume a dummy source or handle it in effect implementation.
	//      const dummySource = { id: "player_relic_source", force: state.gameData.player.id } as Unit;
	//      await processTraitEvent(dummySource, traitData, eventKey, scene, state);
	//   }
	// }
}


// --- Example Trait Definitions (to be moved to data or a registration file) ---

export function defineCoreTraits() {
	registerNewTraitDefinition({
		id: "taunt" as TraitId,
		name: "Taunt",
		description: "If in range, enemies will attack this unit.",
		categories: [TRAIT_CATEGORY_DEFENSIVE, TRAIT_CATEGORY_PERSONALITY],
		effects: [
			// Taunt is often implicit in targeting logic rather than an active effect.
			// If it had an active component, e.g., "onBecomeTargeted: reduce_damage_taken_by_10_percent",
			// it would be defined here. For now, it's a marker trait.
		]
	});

	registerNewTraitDefinition({
		id: "ranged" as TraitId,
		name: "Ranged",
		description: "This unit has a ranged attack.",
		categories: [TRAIT_CATEGORY_OFFENSIVE],
		effects: [{ effectId: "skill_shoot", eventTrigger: "onAction" }]
	});

	registerNewTraitDefinition({
		id: "melee" as TraitId,
		name: "Melee",
		description: "This unit has a melee attack.",
		categories: [TRAIT_CATEGORY_OFFENSIVE],
		effects: [{ effectId: "skill_slash", eventTrigger: "onAction" }]
	});

	registerNewTraitDefinition({
		id: "heal_action" as TraitId, // Renamed from "heal" to avoid conflict if "heal" is an effectId
		name: "Heal Action",
		description: "This unit can heal an ally.",
		categories: [TRAIT_CATEGORY_SUPPORT],
		effects: [{ effectId: "skill_heal", eventTrigger: "onAction" }]
	});

	registerNewTraitDefinition({
		id: "healing_wave_action" as TraitId,
		name: "Healing Wave Action",
		description: "Heals multiple allies.",
		categories: [TRAIT_CATEGORY_SUPPORT],
		effects: [{ effectId: "skill_healing_wave", eventTrigger: "onAction" }]
	});

	registerNewTraitDefinition({
		id: "arcane_missiles_action" as TraitId,
		name: "Arcane Missiles Action",
		description: "Shoots multiple arcane missiles.",
		categories: [TRAIT_CATEGORY_OFFENSIVE],
		effects: [{ effectId: "skill_arcane_missiles", eventTrigger: "onAction" }]
		// If arcane_missiles skill needs params like 'missile_count', they'd be in TraitData on unit
		// e.g. unit.traits = [{ id: "arcane_missiles_action", missile_count: 5 }]
		// and skill_arcane_missiles effect would use context.traitInstanceParams.missile_count
	});

	registerNewTraitDefinition({
		id: "haste_action" as TraitId,
		name: "Haste Action",
		description: "Hastes surrounding allies.",
		categories: [TRAIT_CATEGORY_SUPPORT],
		effects: [{ effectId: "skill_haste", eventTrigger: "onAction" }]
	});

	registerNewTraitDefinition({
		id: "slow_action" as TraitId,
		name: "Slow Action",
		description: "Slows an enemy.",
		categories: [TRAIT_CATEGORY_DEFENSIVE, TRAIT_CATEGORY_OFFENSIVE],
		effects: [{ effectId: "skill_slow", eventTrigger: "onAction" }]
	});

	registerNewTraitDefinition({
		id: "plunder" as TraitId,
		name: "Plunder",
		description: "When this unit attacks, gain 1 gold.",
		categories: [TRAIT_CATEGORY_ECONOMY],
		effects: [{
			effectId: "grant_gold_to_player",
			eventTrigger: "onAttackByMe", // This is an AttackEventKey
			amount: 1, // Default amount
			conditions: [{ type: "is_player_unit" }]
		}]
	});

	registerNewTraitDefinition({
		id: "summon_action" as TraitId,
		name: "Summon Action",
		description: "Summons a unit.",
		categories: [TRAIT_CATEGORY_COMPANION],
		effects: [{
			effectId: "skill_summon", // This effect will look for 'cardIdToSummon' in traitInstanceParams
			eventTrigger: "onAction"
		}]
		// Example usage on a unit: unit.traits = [{ id: "summon_action", cardIdToSummon: "imp" }]
	});

	// Relic-specific traits (often triggered on "onBattleStart")
	registerNewTraitDefinition({
		id: "relic_golden_touch" as TraitId,
		name: "Golden Touch (Relic)",
		description: "Grants gold at the start of battle.",
		categories: [TRAIT_CATEGORY_ECONOMY],
		effects: [{
			effectId: "grant_gold_to_player",
			eventTrigger: "onBattleStart", // Custom event key for battle start
			amount: 5 // This can be overridden by relic's TraitData instance if needed
		}]
	});

	registerNewTraitDefinition({
		id: "relic_reduce_cooldowns" as TraitId,
		name: "Reduce Cooldowns (Relic)",
		description: "Reduces allied heroes' cooldowns at battle start.",
		categories: [TRAIT_CATEGORY_SUPPORT],
		effects: [{
			effectId: "modify_unit_cooldowns",
			eventTrigger: "onBattleStart",
			targetSelector: "all_allies", // Assuming this targets allies of the relic owner
			percent: 10 // Default percentage
		}]
	});

	registerNewTraitDefinition({
		id: "relic_increase_max_hp" as TraitId,
		name: "Increase Max HP (Relic)",
		description: "Increases allied heroes' max HP at battle start.",
		categories: [TRAIT_CATEGORY_SUPPORT],
		effects: [{
			effectId: "modify_unit_max_hp",
			eventTrigger: "onBattleStart",
			targetSelector: "all_allies",
			percent: 15 // Default percentage
		}]
	});
}