/**
 * @file Manages the core definitions, registration, and lookup for trait effects,
 * conditions, and target resolution within the Trait System.
 *
 * This system provides the building blocks for creating complex traits.
 * It allows for defining what a trait does (TraitDefinition), how specific effects
 * are implemented (TraitEffectFn), how effects are gated (TraitConditionFn),
 * and how targets for effects are determined.
 */
import { Unit } from "../Models/Entities/Unit";
import { TraitId, TraitData, RelicStateObject } from "./Traits"; // Import RelicStateObject and TraitData
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import { State } from "../Models/State";
import { getActiveUnits } from "../Models/State"; // For target resolution
import { FORCE_ID_PLAYER } from "../constants/constants";

/**
 * Data for a specific instance of an effect within a TraitDefinition.
 * Parameters like 'amount', 'statusId', 'cardId' are examples and will
 * be defined per effectId.
 */
export type TraitEffectInstanceData = {
	effectId: string; // Maps to a TraitEffectFn in the registry
	/** The game event that triggers this effect (e.g., "onAction", "onAttackByMe"). */
	eventTrigger: string;
	/** Optional selector to determine the target(s) of this effect (e.g., "self", "action_target", "all_allies_in_row"). */
	targetSelector?: string;
	/** Optional array of conditions that must be met for this effect to execute. */
	conditions?: TraitConditionInstanceData[];
	/**
	 * Effect-specific parameters. The structure depends on the `effectId`.
	 * Examples: `amount`, `percent`, `statusId`, `duration`, `cardIdToSummon`.
	 * The responsibility of ensuring necessary parameters are present lies with the trait designer.
	 */
	[key: string]: any; // Allows for arbitrary parameters
};

/**
 * Defines a trait. This structure would ideally be loaded from data.
 */
export type TraitDefinition = {
	id: TraitId;
	/** User-friendly name of the trait. */
	name: string;
	/** Description of what the trait does. */
	description: string;
	/** Categories the trait belongs to (e.g., "offensive", "defensive", "utility"). */
	categories: string[]; // Using string for TraitCategory for now
	/** Array of effect instances that this trait comprises. */
	effects: TraitEffectInstanceData[];
};

/**
 * Data for an instance of a condition.
 * This defines a specific condition to be checked, including its type and any necessary parameters.
 */
export type TraitConditionInstanceData = {
	/** The type of condition, mapping to a `TraitConditionFn` in the registry. */
	type: string; // Maps to a TraitConditionFn
	/** Condition-specific parameters. The structure depends on the `type`. */
	[key: string]: any;
};

/**
 * Context passed to every TraitEffectFn.
 * This object provides all necessary information for an effect's implementation
 * to understand its source, targets, and the broader game state.
 */
export type TraitEffectContext = {
	sourceUnit?: Unit; // The unit that owns the trait, if applicable
	sourceRelic?: RelicStateObject; // The relic that owns the trait, if applicable
	targets: Unit[];
	effectInstance: TraitEffectInstanceData; // The effect data from TraitDefinition
	traitInstanceParams: TraitData; // Instance-specific params from Unit.traits or Relic.traits
	scene: BattlegroundScene;
	state: State;
	/** Optional. The damage amount from an attack, if the event is attack-related. */
	attackDamage?: number;
	/** Optional. Whether an attack was critical, if the event is attack-related. */
	isCritical?: boolean;
	/** Optional. Whether an attack was evaded, if the event is attack-related. */
	evaded?: boolean;
	/** Optional. The primary target of the action that triggered the event (e.g., the target of a skill). */
	primaryTarget?: Unit;
};

/**
 * Signature for a function that implements a trait effect.
 */
export type TraitEffectFn = (context: TraitEffectContext) => Promise<void>;

/**
 * Signature for a function that evaluates a condition.
 * @param context The current TraitEffectContext.
 * @param conditionData The specific data for the condition instance being evaluated.
 * @returns `true` if the condition is met, `false` otherwise.
 */
export type TraitConditionFn = (context: TraitEffectContext, conditionData: TraitConditionInstanceData) => boolean;


// --- Registries ---
const traitDefinitionRegistry = new Map<TraitId, TraitDefinition>();
const traitEffectImplementationRegistry = new Map<string, TraitEffectFn>();
const traitConditionImplementationRegistry = new Map<string, TraitConditionFn>();

// --- Registry Management Functions ---

/**
 * Registers a trait definition in the system.
 * If a definition with the same ID already exists, it will be overwritten.
 * @param definition The `TraitDefinition` to register.
 */
export function registerTraitDefinition(definition: TraitDefinition): void {
	if (traitDefinitionRegistry.has(definition.id)) {
		console.warn(`TraitDefinition with id ${definition.id} already registered. Overwriting.`);
	}
	traitDefinitionRegistry.set(definition.id, definition);
}
/**
 * Retrieves a trait definition by its ID.
 * @param id The `TraitId` of the definition to retrieve.
 * @returns The `TraitDefinition` if found, otherwise `undefined`.
 */
export function getTraitDefinition(id: TraitId): TraitDefinition | undefined {
	return traitDefinitionRegistry.get(id);
}

/**
 * Retrieves all registered trait definitions.
 * @returns An array of all `TraitDefinition` objects.
 */
export function getAllTraitDefinitions(): TraitDefinition[] {
	return Array.from(traitDefinitionRegistry.values());
}

/**
 * Registers an implementation for a specific trait effect.
 * If an implementation for the same `effectId` already exists, it will be overwritten.
 * @param effectId A unique string identifier for the effect.
 * @param implementation The `TraitEffectFn` that implements the effect's logic.
 */
export function registerTraitEffectImplementation(effectId: string, implementation: TraitEffectFn): void {
	if (traitEffectImplementationRegistry.has(effectId)) {
		console.warn(`TraitEffectImplementation for effectId ${effectId} already registered. Overwriting.`);
	}
	traitEffectImplementationRegistry.set(effectId, implementation);
}
/**
 * Retrieves the implementation function for a trait effect by its ID.
 * @param effectId The `effectId` of the implementation to retrieve.
 * @returns The `TraitEffectFn` if found, otherwise `undefined`.
 */
export function getTraitEffectImplementation(effectId: string): TraitEffectFn | undefined {
	return traitEffectImplementationRegistry.get(effectId);
}

/**
 * Registers an implementation for a specific type of trait condition.
 * If an implementation for the same `conditionType` already exists, it will be overwritten.
 * @param conditionType A unique string identifier for the condition type.
 * @param implementation The `TraitConditionFn` that implements the condition's evaluation logic.
 */
export function registerTraitConditionImplementation(conditionType: string, implementation: TraitConditionFn): void {
	if (traitConditionImplementationRegistry.has(conditionType)) {
		console.warn(`TraitConditionImplementation for type ${conditionType} already registered. Overwriting.`);
	}
	traitConditionImplementationRegistry.set(conditionType, implementation);
}
/**
 * Retrieves the implementation function for a trait condition by its type.
 * @param conditionType The `conditionType` of the implementation to retrieve.
 * @returns The `TraitConditionFn` if found, otherwise `undefined`.
 */
export function getTraitConditionImplementation(conditionType: string): TraitConditionFn | undefined {
	return traitConditionImplementationRegistry.get(conditionType);
}


// --- Target Resolution ---

/** Helper to check if the source is a Unit */
function isUnitSource(source: Unit | RelicStateObject): source is Unit {
	return (source as Unit).force !== undefined; // 'force' is a good differentiator for Unit
}

export function resolveTargets(
	/** The source of the trait (either a Unit or a Relic). */
	source: Unit | RelicStateObject,
	/** The force ID of the source. */
	sourceForce: string,
	/** The target selector string (e.g., "self", "all_enemies"). If undefined, defaults to primaryTarget or sourceUnit. */
	selector: string | undefined,
	/** The current game state. */
	state: State,
	/** The current battle scene instance. */
	_scene: BattlegroundScene, // May be needed for more complex selections (e.g., geometry checks)
	/** The primary target of the action that triggered the event, if any. */
	primaryTarget?: Unit
): Unit[] {
	// If no selector is provided, the default target is the primary target of the event (if available).
	// If there's no primary target, and the source is a unit, the source unit itself becomes the target.
	// Relics do not default to "self" as a target unit if no selector or primary target is specified.
	if (!selector) {
		if (primaryTarget) return [primaryTarget];
		if (isUnitSource(source)) return [source as Unit]; // Default to source if it's a unit
		return []; // Relics don't default to "self" as a target unit
	}

	switch (selector) {
		case "self":
			if (isUnitSource(source)) return [source as Unit];
			console.warn(`Target selector "self" used with a non-unit source (Relic ID: ${source.id}). Returning no targets.`);
			return [];
		case "action_target": // The direct target of an action, if applicable
			return primaryTarget ? [primaryTarget] : [];
		case "all_enemies":
			return getActiveUnits(state).filter(u => u.force !== sourceForce);
		case "all_allies":
			return getActiveUnits(state).filter(u => u.force === sourceForce);
		case "random_enemy":
			{
				const enemies = getActiveUnits(state).filter(u => u.force !== sourceForce);
				return enemies.length > 0 ? [enemies[Math.floor(Math.random() * enemies.length)]] : [];
			}
		case "random_ally":
			{
				const allies = getActiveUnits(state).filter(u =>
					u.force === sourceForce &&
					(!isUnitSource(source) || u.id !== (source as Unit).id) // Exclude self if source is a unit
				);
				return allies.length > 0 ? [allies[Math.floor(Math.random() * allies.length)]] : [];
			}
		// Add more selectors: "allies_in_row", "enemies_in_column", "units_in_area", etc.
		default:
			console.warn(`Unknown target selector: ${selector}`);
			if (primaryTarget) return [primaryTarget];
			if (isUnitSource(source)) return [source as Unit];
			return [];
	}
}

// --- Condition Checking ---
/**
 * Checks if all specified conditions for a trait effect are met.
 * @param context The current `TraitEffectContext`.
 * @param conditions An array of `TraitConditionInstanceData` to evaluate. If undefined or empty, conditions are considered met.
 * @returns `true` if all conditions are met (or if no conditions are specified), `false` otherwise.
 */
export function checkConditions(context: TraitEffectContext, conditions: TraitConditionInstanceData[] | undefined): boolean {
	if (!conditions || conditions.length === 0) {
		return true;
	}
	for (const conditionInstance of conditions) {
		const impl = getTraitConditionImplementation(conditionInstance.type);
		if (impl) {
			if (!impl(context, conditionInstance)) {
				return false; // One condition failed
			}
		} else {
			console.warn(`Unknown condition type: ${conditionInstance.type}`);
			return false; // Unknown condition, treat as failed
		}
	}
	return true; // All conditions passed
}

// --- Example Condition Implementations (to be moved to a dedicated file later) ---

/**
 * Condition: Checks if the source of the trait effect belongs to the player.
 */
registerTraitConditionImplementation("is_player_unit", (context) => {
	const sourceForce = context.sourceUnit ? context.sourceUnit.force : context.sourceRelic?.forceId;
	return sourceForce === FORCE_ID_PLAYER;
});

/**
 * Condition: Checks if the first target of the effect is an enemy relative to the source.
 * Note: This assumes targets are already resolved and primarily checks the first target.
 * For multi-target effects where each target needs individual enemy/ally checks, a more complex condition or effect logic might be needed.
 */
registerTraitConditionImplementation("target_is_enemy", (context) => {
	// Assumes targets are already resolved. Checks the first target.
	// More robust checking might be needed for multi-target effects.
	const sourceForce = context.sourceUnit ? context.sourceUnit.force : context.sourceRelic?.forceId;
	if (!sourceForce || context.targets.length === 0) return false;
	return context.targets[0].force !== sourceForce;
});

/**
 * Condition: Checks if the source unit's current HP is below a specified percentage of its maximum HP.
 * Requires `percent` parameter in `conditionData`.
 */
registerTraitConditionImplementation("source_hp_below_percent", (context, conditionData) => {
	const percent = conditionData.percent as number;
	if (typeof percent !== 'number') return false;
	if (!context.sourceUnit) return false;
	return (context.sourceUnit.hp / context.sourceUnit.maxHp) * 100 < percent;
});
