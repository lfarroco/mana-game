/**
 * @file Manages the core logic for traits, including their definition, processing, and event handling.
 * Traits provide special abilities or characteristics to units.
 */

import { State } from "../Models/State";
import { Unit } from "../Models/Entities/Unit";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import {
	TraitEffectContext,
	getTraitDefinition,
	getTraitEffectImplementation,
	resolveTargets,
	checkConditions,
	registerTraitDefinition, // Alias to avoid conflict if any
	TraitDefinition,
	resolveTargetSelectorFromParams,
	resolveConditionsFromParams
} from "./TraitEffectSystem";

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
 * Processes a single trait event for a unit by executing matching effects.
 */
function processTraitEvent(
	source: Unit,
	traitInstanceData: TraitData,
	eventKey: string,
	scene: BattlegroundScene,
	state: State
) {
	const definition = getTraitDefinition(traitInstanceData.id);
	if (!definition) {
		console.warn(`Trait definition not found for ID: ${traitInstanceData.id} on Unit ${source.id}`);
		return;
	}

	for (const effectInstance of definition.effects) {
		// Check for custom trigger parameter, fallback to effect's eventTrigger
		const triggerToMatch = traitInstanceData.trigger || effectInstance.eventTrigger;

		if (triggerToMatch === eventKey) {

			try {
				const sourceForce = source.force;

				// Use the new parameter resolution system for dynamic targeting and conditions
				const targetSelector = resolveTargetSelectorFromParams(traitInstanceData, effectInstance);
				const dynamicConditions = resolveConditionsFromParams(traitInstanceData, effectInstance);

				const targets = resolveTargets(source, sourceForce, targetSelector, state);

				const context: TraitEffectContext = {
					sourceUnit: source,
					targets,
					effectInstance,
					traitInstanceParams: traitInstanceData,
					scene,
					state,
				};

				if (!checkConditions(context, dynamicConditions)) {
					if (process.env.NODE_ENV === 'development') {
						console.debug(`Conditions not met for trait ${definition.id}, effect ${effectInstance.effectId}`);
					}
					continue;
				}

				const implementation = getTraitEffectImplementation(effectInstance.effectId);
				if (implementation) {
					try {
						implementation(context);
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
 * Processes all traits for a unit for a given event.
 */
export function processUnitTraitsForEvent(
	unit: Unit,
	eventKey: string,
	scene: BattlegroundScene,
	state: State,
) {
	unit.traits.forEach(traitData =>
		processTraitEvent(unit, traitData, eventKey, scene, state)
	);
}

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