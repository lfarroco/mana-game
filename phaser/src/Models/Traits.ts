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

/**
 * Minimal representation of a Relic object as stored in the game state,
 * sufficient for trait processing when a relic is the source.
 * The actual Relic type from `state.gameData.player.relics` should conform to this.
 */
export interface RelicStateObject {
	id: string; // Relic's unique ID
	// pic?: string; // Optional: for context if needed by effects
	// name?: string; // Optional: for context
}
/**
 * Optional details specific to an event that might be needed for trait processing.
 */
interface TraitEventDetails {
	primaryTarget?: Unit;
	attackDamage?: number;
	isCritical?: boolean;
	evaded?: boolean;
}

/** Helper to check if the source is a Unit */
function isUnitSource(source: Unit | RelicStateObject): source is Unit {
	return (source as Unit).force !== undefined; // 'force' is a good differentiator for Unit
}

async function processTraitEvent(
	source: Unit | RelicStateObject,
	traitInstanceData: TraitData,
	eventKey: string,
	scene: BattlegroundScene,
	state: State,
	actingPlayerId: string, // ID of the player/force controlling the source
	eventDetails?: TraitEventDetails
) {
	const definition = getTraitDefinition(traitInstanceData.id);
	if (!definition) {
		return;
	}

	for (const effectInstance of definition.effects) {
		if (effectInstance.eventTrigger === eventKey) {
			const targets = resolveTargets(source, actingPlayerId, effectInstance.targetSelector, state, scene, eventDetails?.primaryTarget);

			const context: TraitEffectContext = {
				sourceUnit: isUnitSource(source) ? source as Unit : undefined,
				sourceRelic: !isUnitSource(source) ? source as RelicStateObject : undefined,
				actingPlayerId,
				targets,
				effectInstance,
				traitInstanceParams: traitInstanceData,
				scene,
				state,
				primaryTarget: eventDetails?.primaryTarget,
				attackDamage: eventDetails?.attackDamage,
				isCritical: eventDetails?.isCritical,
				evaded: eventDetails?.evaded,
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
 * Internal helper to iterate over a unit's traits and process them for a given event.
 */
async function processUnitTraitsForEvent(
	unit: Unit,
	eventKey: string,
	scene: BattlegroundScene,
	state: State,
	eventDetails?: TraitEventDetails
) {
	if (!unit.traits) return; // Guard against units with no traits array
	for (const traitData of unit.traits) {
		// For units, the unit itself is the source, and its force is the actingPlayerId.
		await processTraitEvent(unit, traitData, eventKey, scene, state, unit.force, eventDetails);
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
	await processUnitTraitsForEvent(unit, eventKey, scene, state, {
		// No specific details for simple unit events beyond the unit itself as source
		// primaryTarget might be implicitly the unit itself if not specified by trait effect selectors
	});
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
	await processUnitTraitsForEvent(unit, eventKey, scene, state, {
		primaryTarget: target,
		attackDamage: damage,
		isCritical,
		evaded,
	});
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
	await processUnitTraitsForEvent(unit, eventKey, scene, state, { primaryTarget: target });
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
// The refactor above keeps processTraitEvent's signature mostly compatible for this direct use,
// though the `eventDetails` parameter is new. Relic processing passes `dummySource` as `primaryTarget`.
export { processTraitEvent };