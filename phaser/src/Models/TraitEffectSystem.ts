import { Unit } from "./Unit";
import { TraitId, TraitData, RelicStateObject } from "./Traits"; // Import RelicStateObject and TraitData
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import { State } from "./State";
import { getActiveUnits } from "./State"; // For target resolution
import { FORCE_ID_PLAYER } from "../Scenes/Battleground/constants";

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
	// depending on the effect, some properties like
	// the ones might be required
	// the burden of testing is placed upon the trait designer
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
	sourceUnit?: Unit; // The unit that owns the trait, if applicable
	sourceRelic?: RelicStateObject; // The relic that owns the trait, if applicable
	actingPlayerId: string; // ID of the player/force controlling the source
	targets: Unit[];
	effectInstance: TraitEffectInstanceData; // The effect data from TraitDefinition
	traitInstanceParams: TraitData; // Instance-specific params from Unit.traits or Relic.traits
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

/** Helper to check if the source is a Unit */
function isUnitSource(source: Unit | RelicStateObject): source is Unit {
	return (source as Unit).force !== undefined; // 'force' is a good differentiator for Unit
}

export function resolveTargets(
	source: Unit | RelicStateObject,
	actingPlayerId: string, // The player ID of the entity whose trait is firing
	selector: string | undefined,
	state: State,
	_scene: BattlegroundScene, // May be needed for more complex selections (e.g., geometry checks)
	primaryTarget?: Unit
): Unit[] {
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
			return getActiveUnits(state).filter(u => u.force !== actingPlayerId);
		case "all_allies":
			return getActiveUnits(state).filter(u => u.force === actingPlayerId);
		case "random_enemy":
			{
				const enemies = getActiveUnits(state).filter(u => u.force !== actingPlayerId);
				return enemies.length > 0 ? [enemies[Math.floor(Math.random() * enemies.length)]] : [];
			}
		case "random_ally":
			{
				const allies = getActiveUnits(state).filter(u =>
					u.force === actingPlayerId &&
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
	return context.sourceUnit ? context.sourceUnit.force === context.actingPlayerId : context.actingPlayerId === FORCE_ID_PLAYER;
});

registerTraitConditionImplementation("target_is_enemy", (context) => {
	// Assumes targets are already resolved. Checks the first target.
	// More robust checking might be needed for multi-target effects.
	return context.targets.length > 0 && context.targets[0].force !== context.actingPlayerId;
});

registerTraitConditionImplementation("source_hp_below_percent", (context, conditionData) => {
	const percent = conditionData.percent as number;
	if (typeof percent !== 'number') return false;
	if (!context.sourceUnit) return false;
	return (context.sourceUnit.hp / context.sourceUnit.maxHp) * 100 < percent;
});
