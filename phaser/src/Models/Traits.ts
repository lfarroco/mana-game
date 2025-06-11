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
import {
	AttackContextPayload,
	DefenderAttackerPayload,
	UnitKillPayload,
	UnitPayload
} from "./EventPayloads"; // Import necessary payload types

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
	forceId: string; // Force/player ID that owns this relic
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
	return 'attackType' in source; // Use a Unit-specific property to differentiate
}

/**
 * Processes a trait event for a given source (Unit or Relic) by executing any matching effects.
 * This function is the core of the trait system, handling the execution of trait effects based on triggered events.
 * 
 * @param source - The unit or relic that is the source of the trait effect
 * @param traitInstanceData - The specific instance data of the trait being processed
 * @param eventKey - The event that triggered this trait processing (e.g., "onAttack", "onDeath")
 * @param scene - The current BattlegroundScene instance for game state manipulation
 * @param state - The current game state
 * @param actingPlayerId - ID of the player/force controlling the source
 * @param eventDetails - Optional details specific to the triggering event:
 *                      - primaryTarget: The main target unit of the event
 *                      - attackDamage: The amount of damage dealt in an attack
 *                      - isCritical: Whether an attack was critical
 *                      - evaded: Whether an attack was evaded
 * @returns A promise that resolves when all trait effects have been processed
 */
/**
 * Context object containing all parameters needed for processing a trait event
 */
interface TraitEventContext {
	source: Unit | RelicStateObject;
	traitInstanceData: TraitData;
	eventKey: string;
	scene: BattlegroundScene;
	state: State;
	eventDetails?: TraitEventDetails;
}

async function processTraitEvent(context: TraitEventContext) {
	const { source, traitInstanceData, eventKey, scene, state, eventDetails } = context;
	const definition = getTraitDefinition(traitInstanceData.id);
	if (!definition) {
		console.warn(`Trait definition not found for ID: ${traitInstanceData.id} on ${isUnitSource(source) ? `Unit ${(source as Unit).id}` : `Relic ${source.id}`}`);
		return;
	}

	for (const effectInstance of definition.effects) {
		if (effectInstance.eventTrigger === eventKey) {
			try {
				const sourceForce = isUnitSource(source) ? source.force : source.forceId;
				const targets = resolveTargets(source, sourceForce, effectInstance.targetSelector, state, scene, eventDetails?.primaryTarget);

				const context: TraitEffectContext = {
					sourceUnit: isUnitSource(source) ? source as Unit : undefined,
					sourceRelic: !isUnitSource(source) ? source as RelicStateObject : undefined,
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
							`\nSource: ${isUnitSource(source) ? 'Unit' : 'Relic'} ${source.id}`,
							`\nEvent: ${eventKey}`,
							`\nContext:`, context
						);
					}
				} else {
					console.warn(
						`Implementation not found for effectId: ${effectInstance.effectId} in trait ${definition.id}`,
						`\nSource: ${isUnitSource(source) ? 'Unit' : 'Relic'} ${source.id}`
					);
				}
			} catch (error) {
				console.error(
					`Error processing trait effect for ${definition.id}:`,
					error,
					`\nSource: ${isUnitSource(source) ? 'Unit' : 'Relic'} ${source.id}`,
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
		await processTraitEvent({
			source: unit,
			traitInstanceData: traitData,
			eventKey,
			scene,
			state,
			eventDetails
		});
	}
}

/**
 * Processes traits for a unit that are triggered by general unit events.
 * @param eventKey - The specific unit event key (e.g., "onAction", "onDeath").
 * @param scene - The current BattlegroundScene instance.
 * @param state - The current game state.
 * @param unit - The unit whose traits are being processed.
 */
/**
 * @internal
 * Processes traits for a unit based on a UnitPayload.
 */
export const runUnitEventTraits = async (eventKey: UnitEvents_.UnitEventKeys, scene: BattlegroundScene, state: State, payload: UnitPayload) => {
	await processUnitTraitsForEvent(payload.unit, eventKey, scene, state, {
		// No specific details for simple unit events beyond the unit itself as source
		// primaryTarget might be implicitly the unit itself if not specified by trait effect selectors
		// If the event implies the unit itself is the target for some effects,
		// it could be `primaryTarget: payload.unit`. However, resolveTargets defaults
		// to sourceUnit if primaryTarget is undefined, which usually covers this.
		// For clarity, if an event *always* targets self for its effects, this could be set.
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
/**
 * @internal
 * Processes traits for an attacking unit based on an AttackContextPayload.
 */
export const runAttackEventTraits = async (eventKey: UnitEvents_.AttackEventKeys, scene: BattlegroundScene, state: State, payload: AttackContextPayload) => {
	await processUnitTraitsForEvent(payload.unit, eventKey, scene, state, {
		primaryTarget: payload.target,
		attackDamage: payload.damage,
		isCritical: payload.isCritical,
		evaded: payload.evaded,
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

/** @internal */
export type UnitEventWithTargetPayload = DefenderAttackerPayload | UnitKillPayload;

/**
 * @internal
 * Processes traits for a unit involved in an event with another target unit,
 * based on a UnitEventWithTargetPayload.
 * `payload.unit` is always the unit whose traits are being processed.
 */
export const runUnitEventWithTargetTraits = async (eventKey: UnitEvents_.UnitEventWithTargetKeys, scene: BattlegroundScene, state: State, payload: UnitEventWithTargetPayload) => {
	let primaryTargetForEvent: Unit | undefined;

	if ('attacker' in payload) { // DefenderAttackerPayload
		primaryTargetForEvent = payload.attacker;
	} else { // UnitKillPayload
		// payload.unit is the unit whose traits are processed.
		// The "other" unit in the payload is the primary target for the event context.
		if (eventKey === "onUnitKillByMe" && 'killedUnit' in payload) {
			primaryTargetForEvent = payload.killedUnit;
		} else if ('killer' in payload && (eventKey === "onUnitKill" || eventKey === "onAlliedKilled" || eventKey === "onEnemyKilled")) {
			primaryTargetForEvent = payload.killer;
		}
	}
	await processUnitTraitsForEvent(payload.unit, eventKey, scene, state, { primaryTarget: primaryTargetForEvent });
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