/**
 * @file Manages the core logic for traits, including their definition, processing, and event handling.
 * Traits provide special abilities or characteristics to units and relics.
 */

import { State } from "./State";
import { Unit } from "./Unit";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import * as UnitEvents_ from "./UnitEvents";
import {
	TraitEffectContext,
	getTraitDefinition,
	getTraitEffectImplementation,
	resolveTargets,
	checkConditions,
	registerTraitDefinition, // Alias to avoid conflict if any
	TraitDefinition
} from "./TraitEffectSystem";

/**
 * A unique identifier for a trait.
 * The `__traitId` property is a nominal typing marker and does not exist at runtime.
 */
export type TraitId = string & { __traitId: never };

/**
 * A unique identifier for a trait.
 * The `__traitId` property is a nominal typing marker and does not exist at runtime.
 */
export type TraitCategory = string & { __traitCategory: never };

/**
 * Represents an instance of a trait attached to a unit or relic.
 * It includes the trait's ID and any instance-specific parameters.
 * @property id - The unique identifier of the trait definition.
 * @property [key: string] - Additional parameters specific to this trait instance,
 *                           which can override or supplement defaults from the TraitDefinition.
 */
export type TraitData = { // This is an *instance* of a trait on a unit/relic
	id: TraitId;
	[key: string]: any;
};

async function processTraitEvent(
	sourceUnit: Unit,
	traitInstanceData: TraitData,
	eventKey: string,
	scene: BattlegroundScene,
	state: State,
	primaryTarget?: Unit,
	attackDamage?: number,
	isCritical?: boolean,
	evaded?: boolean
) {
	const definition = getTraitDefinition(traitInstanceData.id);
	if (!definition) {
		return;
	}

	for (const effectInstance of definition.effects) {
		if (effectInstance.eventTrigger === eventKey) {
			const targets = resolveTargets(sourceUnit, effectInstance.targetSelector, state, scene, primaryTarget);

			const context: TraitEffectContext = {
				sourceUnit,
				targets,
				effectInstance,
				traitInstanceParams: traitInstanceData,
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

/**
 * Processes traits for a unit that are triggered by general unit events.
 * @param eventKey - The specific unit event key (e.g., "onAction", "onDeath").
 * @param scene - The current BattlegroundScene instance.
 * @param state - The current game state.
 * @param unit - The unit whose traits are being processed.
 */
export const runUnitEventTraits = async (eventKey: UnitEvents_.UnitEventKeys, scene: BattlegroundScene, state: State, unit: Unit) => {
	for (const traitData of unit.traits) {
		await processTraitEvent(unit, traitData, eventKey, scene, state);
	}
};

/**
 * Processes traits for a unit that are triggered by attack-related events.
 * @param eventKey - The specific attack event key (e.g., "onAttackByMe", "onAfterAttackByMe").
 * @param scene - The current BattlegroundScene instance.
 * @param state - The current game state.
 * @param unit - The attacking unit.
 * @param target - The target unit of the attack.
 * @param damage - The damage dealt by the attack.
 * @param isCritical - Whether the attack was a critical hit.
 * @param evaded - Whether the attack was evaded.
 */
export const runAttackEventTraits = async (eventKey: UnitEvents_.AttackEventKeys, scene: BattlegroundScene, state: State, unit: Unit, target: Unit, damage: number, isCritical: boolean, evaded: boolean) => {
	for (const traitData of unit.traits) {
		await processTraitEvent(unit, traitData, eventKey, scene, state, target, damage, isCritical, evaded);
	}
};

/**
 * Processes traits for a unit that are triggered by unit events involving a target.
 * @param eventKey - The specific unit event key with a target (e.g., "onDefendByMe", "onUnitKillByMe").
 * @param scene - The current BattlegroundScene instance.
 * @param state - The current game state.
 * @param unit - The unit whose traits are being processed (often the source of the event).
 * @param target - The target unit involved in the event.
 */
export const runUnitEventWithTargetTraits = async (eventKey: UnitEvents_.UnitEventWithTargetKeys, scene: BattlegroundScene, state: State, unit: Unit, target: Unit) => {
	for (const traitData of unit.traits) {
		await processTraitEvent(unit, traitData, eventKey, scene, state, target);
	}
};


/**
 * Initializes and registers trait definitions from a loaded data source.
 * This function should be called once during game setup with the trait definitions
 * (e.g., loaded from a JSON file or defined in code).
 * @param traitDefinitions An array of TraitDefinition objects.
 */
export function initializeTraitsFromData(traitDefinitions: TraitDefinition[]): void {
	traitDefinitions.forEach(traitDef => {
		// The TraitDefinition type expects `id` to be `TraitId`.
		// When loaded from JSON, `id` is a string. Casting it here aligns with the type.
		registerTraitDefinition(traitDef as TraitDefinition);
	});
}

// Export `processTraitEvent` for use in `TraitSystemEventListeners.ts` for relic handling.
// This is generally an internal function, but relic event processing currently uses it directly.
export { processTraitEvent };