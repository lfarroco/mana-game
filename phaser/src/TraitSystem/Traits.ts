/**
 * @file Manages the core logic for traits, including their definition, processing, and event handling.
 * Traits provide special abilities or characteristics to units.
 */

import { State } from "../Models/State";
import { Unit } from "../Models/Entities/Unit";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import * as UnitEvents_ from "../Models/UnitEvents";
import {
	TraitEffectContext,
	getTraitDefinition,
	getTraitEffectImplementation,
	resolveTargets,
	checkConditions,
	registerTraitDefinition, // Alias to avoid conflict if any
	TraitDefinition
} from "./TraitEffectSystem";
import {
	UnitPayload
} from "../Models/EventPayloads"; // Import necessary payload types

/**
 * A unique identifier for a trait.
 * The `__traitId` property is a nominal typing marker and does not exist at runtime.
 */
export type TraitId = string & { __traitId: never };

/**
 * Represents an instance of a trait attached to a unit.
 * It includes the trait's ID and any instance-specific parameters.
 * @property id - The unique identifier of the trait definition.
 * @property [key: string] - Additional parameters specific to this trait instance,
 *                           which can override or supplement defaults from the TraitDefinition.
 */
export type TraitData = { // This is an *instance* of a trait on a unit
	id: TraitId;
	[key: string]: any;
};

/**
 * Processes a trait event for a given source (Unit) by executing any matching effects.
 * This function is the heart of the trait system. It:
 * 1. Retrieves the trait definition.
 * 2. Iterates through the effects defined for that trait.
 * 3. For each effect, checks if it matches the current `eventKey`.
 * 4. If it matches, resolves the targets for the effect.
 * 5. Creates a `TraitEffectContext` with all necessary information.
 * 6. Checks any conditions defined for the effect.
 * 7. If conditions pass, retrieves and executes the effect's implementation.
 *
 * @param context - An object containing all necessary parameters for processing the event.
 * @returns A promise that resolves when all relevant trait effects for this event have been processed.
 */
/**
 * Context object containing all parameters needed for processing a trait event via `processTraitEvent`.
 */
interface TraitEventContext {
	/** The unit that is the source of the trait effect. */
	source: Unit;
	/** The specific instance data of the trait being processed (e.g., from `unit.traits`). */
	traitInstanceData: TraitData;
	eventKey: string;
	scene: BattlegroundScene;
	state: State;
}

async function processTraitEvent(context: TraitEventContext) {
	const { source, traitInstanceData, eventKey, scene, state } = context;
	const definition = getTraitDefinition(traitInstanceData.id);
	if (!definition) {
		console.warn(`Trait definition not found for ID: ${traitInstanceData.id} on Unit ${source.id}`);
		return;
	}

	for (const effectInstance of definition.effects) {
		if (effectInstance.eventTrigger === eventKey) {

			try {
				const sourceForce = source.force;
				const targets = resolveTargets(source, sourceForce, effectInstance.targetSelector, state, scene);

				const context: TraitEffectContext = {
					sourceUnit: source,
					targets,
					effectInstance,
					traitInstanceParams: traitInstanceData,
					scene,
					state,
				};

				if (!checkConditions(context, effectInstance.conditions)) {
					if (process.env.NODE_ENV === 'development') {
						console.debug(`Conditions not met for trait ${definition.id}, effect ${effectInstance.effectId}`);
					}
					continue;
				}

				const implementation = getTraitEffectImplementation(effectInstance.effectId);
				if (implementation) {
					try {
						await implementation(context);
					} catch (error) {
						console.error(
							`Error executing trait effect ${effectInstance.effectId} for trait ${definition.id}:`,
							error,
							`\nSource Unit: ${source.id}`,
							`\nEvent: ${eventKey}`,
							`\nContext:`, context
						);
					}
				} else {
					console.warn(
						`Implementation not found for effectId: ${effectInstance.effectId} in trait ${definition.id}`,
						`\nSource: Unit: ${source.id}`
					);
				}
			} catch (error) {
				console.error(
					`Error processing trait effect for ${definition.id}:`,
					error,
					`\nSource Unit: ${source.id}`,
					`\nEvent: ${eventKey}`,
					`\nEffect:`, effectInstance
				);
			}
		}
	}
}

/**
 * Internal helper to iterate over a unit's traits and process them for a given event.
 */
function processUnitTraitsForEvent(
	unit: Unit,
	eventKey: string,
	scene: BattlegroundScene,
	state: State,
) {
	for (const traitData of unit.traits) {
		// For units, the unit itself is the source, and its force is the actingPlayerId.
		processTraitEvent({
			source: unit,
			traitInstanceData: traitData,
			eventKey,
			scene,
			state,
		});
	}
}

/**
 * Processes traits for a unit based on a simple `UnitPayload`.
 * These are typically events where the unit itself is the primary actor or subject.
 *
 * @param eventKey The specific `UnitEventKeys` (e.g., "onAction").
 * @internal
 * Processes traits for a unit based on a UnitPayload.
 */
export const runUnitEventTraits = async (eventKey: UnitEvents_.UnitEventKeys, scene: BattlegroundScene, state: State, payload: UnitPayload) => {
	await processUnitTraitsForEvent(payload.unit, eventKey, scene, state);
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