/**
 * @file Defines trait processing and registration for unit-based traits.
 * Handles trait execution in response to game events, with support for
 * conditions, dynamic targeting, and parameter resolution.
 */
import {
	TraitEffectContext,
	TraitEffectInstanceData,
	getTraitDefinition,
	getTraitEffectImplementation,
	TraitDefinition,
	resolveTargets,
	registerTraitDefinition,
	checkConditions,
	resolveTargetSelectorFromParams,
	resolveConditionsFromParams
} from "./TraitEffectSystem";
import { State } from "../Models/State";
import { Unit } from "../Models/Entities/Unit";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";

/**
 * A unique identifier for a trait.
 * The `__traitId` property is a nominal typing marker and does not exist at runtime.
 */
export type TraitId = string & { __traitId: never };

/**
 * Represents an instance of a trait attached to a unit.
 * It includes the trait's ID and any instance-specific parameters.
 * @property id - The unique identifier of the trait definition.
 * @property effectId - Optional direct effect reference (bypasses trait definition lookup)
 * @property eventTrigger - Optional event trigger (when using direct effects)
 * @property [key: string] - Additional parameters specific to this trait instance,
 *                           which can override or supplement defaults from the TraitDefinition.
 */
export type TraitData = { // This is an *instance* of a trait on a unit
	id?: TraitId;
	effectId?: string; // Direct effect reference
	eventTrigger?: string; // Event trigger for direct effects
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
	// Handle direct effect reference (simplified traits)
	if (traitInstanceData.effectId && traitInstanceData.eventTrigger) {
		const triggerToMatch = traitInstanceData.trigger || traitInstanceData.eventTrigger;

		if (triggerToMatch === eventKey) {
			try {
				const sourceForce = source.force;

				// Create a synthetic effect instance from the trait data
				const effectInstance: TraitEffectInstanceData = {
					effectId: traitInstanceData.effectId,
					eventTrigger: traitInstanceData.eventTrigger,
					targetSelector: traitInstanceData.targetSelector,
					conditions: traitInstanceData.conditions,
					...traitInstanceData // Include all other parameters
				};

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
						console.debug(`Conditions not met for direct effect ${traitInstanceData.effectId}`);
					}
					return;
				}

				const implementation = getTraitEffectImplementation(traitInstanceData.effectId);
				if (implementation) {
					try {
						implementation(context);
					} catch (error) {
						console.error(
							`Error executing direct effect ${traitInstanceData.effectId}:`,
							error,
							`\nSource Unit: ${source.id}`,
							`\nEvent: ${eventKey}`,
							`\nContext:`, context
						);
					}
				} else {
					console.warn(
						`Implementation not found for direct effectId: ${traitInstanceData.effectId}`,
						`\nSource: Unit: ${source.id}`
					);
				}
			} catch (error) {
				console.error(
					`Error processing direct effect ${traitInstanceData.effectId}:`,
					error,
					`\nSource Unit: ${source.id}`,
					`\nEvent: ${eventKey}`,
					`\nTrait Data:`, traitInstanceData
				);
			}
		}
		return; // Exit early for direct effects
	}

	// Handle traditional trait definition lookup
	if (!traitInstanceData.id) {
		console.warn(`Trait instance missing both 'id' and 'effectId' on Unit ${source.id}:`, traitInstanceData);
		return;
	}

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