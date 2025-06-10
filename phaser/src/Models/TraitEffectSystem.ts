import { Unit } from "./Unit";
import { TraitId } from "./Traits"; // We'll move TraitId here or make it global
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import { State } from "./State";
import { getActiveUnits, getAllActiveFoes } from "./State"; // For target resolution
import { playerForce } from "./Force";

// Forward declaration, will be fully defined in Traits.ts or a shared types file
// For now, let's assume TraitId is accessible.

/**
 * Data for a specific instance of an effect within a TraitDefinition.
 * Parameters like 'amount', 'statusId', 'cardId' are examples and will
 * be defined per effectId.
 */
export type TraitEffectInstanceData = {
	effectId: string; // Maps to a TraitEffectFn in the registry
	eventTrigger: string; // e.g., "onAction", "onAttackByMe", "onBattleStart"
	targetSelector?: string; // e.g., "self", "action_target", "all_allies_in_row"
	conditions?: TraitConditionInstanceData[]; // Conditions for this effect to run
	// Effect-specific parameters, e.g.:
	// amount?: number;
	// percent?: number;
	// statusId?: string;
	// duration?: number;
	// cardIdToSummon?: string;
	// message?: string;
	[key: string]: any; // Allows for arbitrary parameters
};

/**
 * Defines a trait. This structure would ideally be loaded from data.
 */
export type TraitDefinition = {
	id: TraitId;
	name: string;
	description: string;
	categories: string[]; // Using string for TraitCategory for now
	effects: TraitEffectInstanceData[];
};

/**
 * Data for an instance of a condition.
 */
export type TraitConditionInstanceData = {
	type: string; // Maps to a TraitConditionFn
	// Condition-specific parameters
	[key: string]: any;
};

/**
 * Context passed to every TraitEffectFn.
 */
export type TraitEffectContext = {
	sourceUnit: Unit;
	targets: Unit[];
	effectInstance: TraitEffectInstanceData; // The effect data from TraitDefinition
	traitInstanceParams: { [key: string]: any }; // Instance-specific params from Unit.traits or Relic.traits
	scene: BattlegroundScene;
	state: State;
	// Optional, for attack-related events
	attackDamage?: number;
	isCritical?: boolean;
	evaded?: boolean;
	// Optional, for events with an explicit primary target (like a skill use)
	primaryTarget?: Unit;
};

/**
 * Signature for a function that implements a trait effect.
 */
export type TraitEffectFn = (context: TraitEffectContext) => Promise<void>;

/**
 * Signature for a function that evaluates a condition.
 */
export type TraitConditionFn = (context: TraitEffectContext, conditionData: TraitConditionInstanceData) => boolean;


// --- Registries ---
const traitDefinitionRegistry = new Map<TraitId, TraitDefinition>();
const traitEffectImplementationRegistry = new Map<string, TraitEffectFn>();
const traitConditionImplementationRegistry = new Map<string, TraitConditionFn>();

// --- Registry Management Functions ---
export function registerTraitDefinition(definition: TraitDefinition): void {
	if (traitDefinitionRegistry.has(definition.id)) {
		console.warn(`TraitDefinition with id ${definition.id} already registered. Overwriting.`);
	}
	traitDefinitionRegistry.set(definition.id, definition);
}

export function getTraitDefinition(id: TraitId): TraitDefinition | undefined {
	return traitDefinitionRegistry.get(id);
}

export function getAllTraitDefinitions(): TraitDefinition[] {
	return Array.from(traitDefinitionRegistry.values());
}

export function registerTraitEffectImplementation(effectId: string, implementation: TraitEffectFn): void {
	if (traitEffectImplementationRegistry.has(effectId)) {
		console.warn(`TraitEffectImplementation for effectId ${effectId} already registered. Overwriting.`);
	}
	traitEffectImplementationRegistry.set(effectId, implementation);
}

export function getTraitEffectImplementation(effectId: string): TraitEffectFn | undefined {
	return traitEffectImplementationRegistry.get(effectId);
}

export function registerTraitConditionImplementation(conditionType: string, implementation: TraitConditionFn): void {
	if (traitConditionImplementationRegistry.has(conditionType)) {
		console.warn(`TraitConditionImplementation for type ${conditionType} already registered. Overwriting.`);
	}
	traitConditionImplementationRegistry.set(conditionType, implementation);
}

export function getTraitConditionImplementation(conditionType: string): TraitConditionFn | undefined {
	return traitConditionImplementationRegistry.get(conditionType);
}


// --- Target Resolution ---
// (Simplified for now, can be expanded)
export function resolveTargets(
	sourceUnit: Unit,
	selector: string | undefined,
	state: State,
	_scene: BattlegroundScene, // May be needed for more complex selections (e.g., geometry checks)
	primaryTarget?: Unit
): Unit[] {
	if (!selector) return primaryTarget ? [primaryTarget] : [sourceUnit]; // Default to source or primary target

	switch (selector) {
		case "self":
			return [sourceUnit];
		case "action_target": // The direct target of an action, if applicable
			return primaryTarget ? [primaryTarget] : [];
		case "all_enemies":
			return getAllActiveFoes(state)(sourceUnit.force);
		case "all_allies":
			return getActiveUnits(state).filter(u => u.force === sourceUnit.force);
		case "random_enemy":
			{
				const enemies = getAllActiveFoes(state)(sourceUnit.force);
				return enemies.length > 0 ? [enemies[Math.floor(Math.random() * enemies.length)]] : [];
			}
		case "random_ally":
			{
				const allies = getActiveUnits(state).filter(u => u.force === sourceUnit.force && u.id !== sourceUnit.id);
				return allies.length > 0 ? [allies[Math.floor(Math.random() * allies.length)]] : [];
			}
		// Add more selectors: "allies_in_row", "enemies_in_column", "units_in_area", etc.
		default:
			console.warn(`Unknown target selector: ${selector}`);
			return primaryTarget ? [primaryTarget] : [sourceUnit];
	}
}

// --- Condition Checking ---
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
registerTraitConditionImplementation("is_player_unit", (context) => {
	return context.sourceUnit.force === playerForce.id;
});

registerTraitConditionImplementation("target_is_enemy", (context) => {
	// Assumes targets are already resolved. Checks the first target.
	// More robust checking might be needed for multi-target effects.
	return context.targets.length > 0 && context.targets[0].force !== context.sourceUnit.force;
});

registerTraitConditionImplementation("source_hp_below_percent", (context, conditionData) => {
	const percent = conditionData.percent as number;
	if (typeof percent !== 'number') return false;
	return (context.sourceUnit.hp / context.sourceUnit.maxHp) * 100 < percent;
});
