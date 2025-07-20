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
import { TraitId, TraitData } from "./Traits";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import { State } from "../Models/State";
import { getActiveUnits } from "../Models/State"; // For target resolution
import { FORCE_ID_PLAYER } from "../constants/constants";
import { pickRandom, pickOne } from "../utils";

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
	sourceUnit: Unit; // The unit that owns the trait.
	targets: Unit[];
	effectInstance: TraitEffectInstanceData; // The effect data from TraitDefinition
	traitInstanceParams: TraitData; // Instance-specific params from Unit.traits
	scene: BattlegroundScene;
	state: State;
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

/**
 * SIMPLIFIED TARGETING STRATEGY:
 * 
 * Enemy Targeting: All enemy selectors now return the closest enemy for simplicity.
 * This includes "enemy", "closest_enemy", and "all_enemies" (legacy).
 * The game no longer has complex individual enemy targeting.
 * 
 * Exception: "enemy_guild" returns ALL enemies for guild-wide effects (morale, etc.)
 * 
 * Allied Targeting: Retains full positional logic to maintain formation strategy.
 * Players can still use positioning for tactical advantages with ally buffs.
 */

export function resolveTargets(
	/** The source of the trait (a Unit). */
	source: Unit,
	/** The force ID of the source. */
	sourceForce: string,
	/** The target selector string (e.g., "self", "all_allies", "enemy"). If undefined, defaults to primaryTarget or sourceUnit. */
	selector: string | undefined,
	/** The current game state. */
	state: State,
	/** The current battle scene instance. */
	_scene: BattlegroundScene, // May be needed for more complex selections (e.g., geometry checks)
): Unit[] {
	// Helper function to find closest enemy
	const findClosestEnemy = (): Unit[] => {
		const enemies = getActiveUnits(state).filter(u => u.force !== sourceForce);
		if (enemies.length === 0) return [];

		// Calculate Manhattan distance and find closest
		const closestEnemy = enemies.reduce((closest, enemy) => {
			const distToEnemy = Math.abs(enemy.position.x - source.position.x) + Math.abs(enemy.position.y - source.position.y);
			const distToClosest = Math.abs(closest.position.x - source.position.x) + Math.abs(closest.position.y - source.position.y);
			return distToEnemy < distToClosest ? enemy : closest;
		});

		return [closestEnemy];
	};

	switch (selector) {
		case undefined:
			return [source];
		case "self":
			return [source];
		// === SIMPLIFIED ENEMY TARGETING ===
		// All enemy targeting now uses closest enemy for simplicity
		case "enemy":
		case "closest_enemy":
		case "all_enemies": // Legacy support - now returns closest enemy for simplicity
			return findClosestEnemy();
		case "random_enemies": {
			const enemies = getActiveUnits(state).filter(u => u.force !== sourceForce);
			return pickRandom(enemies, enemies.length); // Return all enemies in random order
		}
		case "random_enemy": {
			const enemies = getActiveUnits(state).filter(u => u.force !== sourceForce);
			if (enemies.length === 0) return [];
			return [pickOne(enemies)]; // Return a single random enemy
		}

		// === POSITIONAL ALLIED TARGETING ===
		// Allied targeting retains positional logic for formation strategy
		case "all_allies":
			return getActiveUnits(state).filter(u => u.force === sourceForce && u.id !== source.id);
		case "random_allies": {
			const allies = getActiveUnits(state).filter(u => u.force === sourceForce && u.id !== source.id);
			return pickRandom(allies, allies.length); // Return all allies in random order
		}
		case "random_ally": {
			const allies = getActiveUnits(state).filter(u => u.force === sourceForce && u.id !== source.id);
			if (allies.length === 0) return [];
			return [pickOne(allies)]; // Return a single random ally
		}
		case "all_allies_in_row":
			return getActiveUnits(state).filter(u => u.force === sourceForce && u.id !== source.id && u.position.y === source.position.y);
		case "all_allies_in_column":
			return getActiveUnits(state).filter(u => u.force === sourceForce && u.id !== source.id && u.position.x === source.position.x);
		case "ally_left": {
			const targetPos = { x: source.position.x - 1, y: source.position.y };
			return getActiveUnits(state).filter(u => u.force === sourceForce && u.position.x === targetPos.x && u.position.y === targetPos.y);
		}
		case "ally_right": {
			const targetPos = { x: source.position.x + 1, y: source.position.y };
			return getActiveUnits(state).filter(u => u.force === sourceForce && u.position.x === targetPos.x && u.position.y === targetPos.y);
		}
		case "ally_front": {
			const yOffset = source.force === FORCE_ID_PLAYER ? -1 : 1;
			const targetPos = { x: source.position.x, y: source.position.y + yOffset };
			return getActiveUnits(state).filter(u => u.force === sourceForce && u.position.x === targetPos.x && u.position.y === targetPos.y);
		}
		case "ally_back": {
			const yOffset = source.force === FORCE_ID_PLAYER ? 1 : -1;
			const targetPos = { x: source.position.x, y: source.position.y + yOffset };
			return getActiveUnits(state).filter(u => u.force === sourceForce && u.position.x === targetPos.x && u.position.y === targetPos.y);
		}
		case "allies_adjacent": {
			const adjacentPositions = [
				{ x: source.position.x - 1, y: source.position.y },     // left
				{ x: source.position.x + 1, y: source.position.y },     // right
				{ x: source.position.x, y: source.position.y - 1 },     // above
				{ x: source.position.x, y: source.position.y + 1 }      // below
			];
			return getActiveUnits(state).filter(u =>
				u.force === sourceForce &&
				u.id !== source.id &&
				adjacentPositions.some(pos => u.position.x === pos.x && u.position.y === pos.y)
			);
		}
		case "allies_diagonal": {
			const diagonalPositions = [
				{ x: source.position.x - 1, y: source.position.y - 1 },     // top-left
				{ x: source.position.x + 1, y: source.position.y - 1 },     // top-right
				{ x: source.position.x - 1, y: source.position.y + 1 },     // bottom-left
				{ x: source.position.x + 1, y: source.position.y + 1 }      // bottom-right
			];
			return getActiveUnits(state).filter(u =>
				u.force === sourceForce &&
				u.id !== source.id &&
				diagonalPositions.some(pos => u.position.x === pos.x && u.position.y === pos.y)
			);
		}
		case "enemies_adjacent": {
			// Note: Since enemies are on separate boards, adjacent enemies can only exist 
			// if there are units from different forces on the same board (which shouldn't happen in normal gameplay)
			const adjacentPositions = [
				{ x: source.position.x - 1, y: source.position.y },     // left
				{ x: source.position.x + 1, y: source.position.y },     // right
				{ x: source.position.x, y: source.position.y - 1 },     // above
				{ x: source.position.x, y: source.position.y + 1 }      // below
			];
			return getActiveUnits(state).filter(u =>
				u.force !== sourceForce &&
				adjacentPositions.some(pos => u.position.x === pos.x && u.position.y === pos.y)
			);
		}
		case "all_enemies_in_column":
			return getActiveUnits(state).filter(u => u.force !== sourceForce && u.position.x === source.position.x);
		case "enemies_in_row":
			// Note: Since enemies are on separate boards, they can't be in the same row as player units
			// This selector will always return empty array for cross-board targeting
			return [];

		// === GUILD-WIDE EFFECTS ===
		// Special case: when you need ALL enemies (for guild-wide effects like morale)
		case "enemy_guild":
			return getActiveUnits(state).filter(u => u.force !== sourceForce);

		// === RANDOM UNIT TARGETING ===
		// Targets any unit on the battlefield (allies and enemies)
		case "random_units": {
			const allUnits = getActiveUnits(state).filter(u => u.id !== source.id);
			return pickRandom(allUnits, allUnits.length); // Return all units in random order
		}
		case "random_unit": {
			const allUnits = getActiveUnits(state).filter(u => u.id !== source.id);
			if (allUnits.length === 0) return [];
			return [pickOne(allUnits)]; // Return a single random unit
		}

		default:
			console.warn(`Unknown target selector: ${selector}. Using closest enemy as fallback.`);
			return findClosestEnemy();
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
	return context.sourceUnit.force === FORCE_ID_PLAYER;
});

/**
 * Condition: Checks if the first target of the effect is an enemy relative to the source.
 * Note: This assumes targets are already resolved and primarily checks the first target.
 * For multi-target effects where each target needs individual enemy/ally checks, a more complex condition or effect logic might be needed.
 */
registerTraitConditionImplementation("target_is_enemy", (context) => {
	// Assumes targets are already resolved. Checks the first target.
	// More robust checking might be needed for multi-target effects.
	if (context.targets.length === 0) return false;
	return context.targets[0].force !== context.sourceUnit.force;
});

/**
 * Condition: Checks if the source unit is in a specific row.
 * Requires `row` parameter in `conditionData` ('front', 'mid', or 'back').
 */
registerTraitConditionImplementation("is_in_row", (context, conditionData) => {
	const { sourceUnit } = context;
	const row = conditionData.row as 'front' | 'mid' | 'back';

	if (!row) {
		if (process.env.NODE_ENV === 'development') {
			console.error(`'is_in_row' condition is missing sourceUnit or 'row' parameter.`, { sourceUnit, row });
		}
		return false;
	}

	const boardHeightInTiles = 3; // Standard 3x3 board
	const backRowY = boardHeightInTiles - 1;
	const midRowY = 1;
	const frontRowY = 0;

	const unitY = sourceUnit.position.y;

	if (sourceUnit.force === FORCE_ID_PLAYER) {
		if (row === 'back' && unitY === backRowY) return true;
		if (row === 'mid' && unitY === midRowY) return true;
		if (row === 'front' && unitY === frontRowY) return true;
	} else { // CPU force
		if (row === 'back' && unitY === frontRowY) return true; // CPU back is at y=0
		if (row === 'mid' && unitY === midRowY) return true;
		if (row === 'front' && unitY === backRowY) return true; // CPU front is at y=2
	}

	return false;
});

/**
 * Condition: Checks if the source unit is in a specific column.
 * Requires `column` parameter in `conditionData` ('left', 'mid', or 'right').
 */
registerTraitConditionImplementation("is_in_column", (context, conditionData) => {
	const { sourceUnit } = context;
	const column = conditionData.column as 'left' | 'mid' | 'right';

	if (!column) {
		if (process.env.NODE_ENV === 'development') {
			console.error(`'is_in_column' condition is missing 'column' parameter.`, { sourceUnit, column });
		}
		return false;
	}

	const leftColX = 0;
	const midColX = 1;
	const rightColX = 2;

	const unitX = sourceUnit.position.x;

	if (column === 'left' && unitX === leftColX) return true;
	if (column === 'mid' && unitX === midColX) return true;
	if (column === 'right' && unitX === rightColX) return true;

	return false;
});

/**
 * Condition: Checks if enough time has passed in battle.
 * Alternative to HP-based conditions - time-based activation.
 * Requires `seconds` parameter in `conditionData`.
 */
registerTraitConditionImplementation("battle_time_elapsed", (context, conditionData) => {
	const requiredSeconds = conditionData.seconds as number;
	if (typeof requiredSeconds !== 'number') return false;
	const battleTimeSeconds = context.scene.time.now / 1000;
	return battleTimeSeconds >= requiredSeconds;
});

/**
 * Condition: Checks if the source unit is in a corner position.
 */
registerTraitConditionImplementation("is_in_corner", (context) => {
	const { sourceUnit } = context;
	const x = sourceUnit.position.x;
	const y = sourceUnit.position.y;

	// Corner positions in a 3x3 grid: (0,0), (0,2), (2,0), (2,2)
	return (x === 0 || x === 2) && (y === 0 || y === 2);
});

/**
 * Condition: Checks if the source unit has no adjacent allies.
 */
registerTraitConditionImplementation("has_no_adjacent_allies", (context) => {
	const { sourceUnit, state } = context;
	const adjacentPositions = [
		{ x: sourceUnit.position.x - 1, y: sourceUnit.position.y },
		{ x: sourceUnit.position.x + 1, y: sourceUnit.position.y },
		{ x: sourceUnit.position.x, y: sourceUnit.position.y - 1 },
		{ x: sourceUnit.position.x, y: sourceUnit.position.y + 1 }
	];

	const allies = getActiveUnits(state).filter(u =>
		u.force === sourceUnit.force &&
		u.id !== sourceUnit.id &&
		adjacentPositions.some(pos => u.position.x === pos.x && u.position.y === pos.y)
	);

	return allies.length === 0;
});

/**
 * Condition: Checks if the source unit is in the center position.
 */
registerTraitConditionImplementation("is_in_center", (context) => {
	const { sourceUnit } = context;
	// Center of 3x3 grid is (1,1)
	return sourceUnit.position.x === 1 && sourceUnit.position.y === 1;
});

/**
 * Condition: Checks if the source unit is on the edge of the board.
 */
registerTraitConditionImplementation("is_on_edge", (context) => {
	const { sourceUnit } = context;
	const x = sourceUnit.position.x;
	const y = sourceUnit.position.y;

	// Edge positions: x=0, x=2, y=0, or y=2 in a 3x3 grid
	return x === 0 || x === 2 || y === 0 || y === 2;
});

/**
 * Condition: Checks if allies are in a formation pattern.
 * This is a simplified formation check - can be expanded later.
 */
registerTraitConditionImplementation("formation_bonus", (context) => {
	const { sourceUnit, state } = context;
	const allies = getActiveUnits(state).filter(u =>
		u.force === sourceUnit.force && u.id !== sourceUnit.id
	);

	// Simple formation: at least 2 allies in a line (row or column) with the source unit
	const sameRow = allies.filter(u => u.position.y === sourceUnit.position.y);
	const sameCol = allies.filter(u => u.position.x === sourceUnit.position.x);

	return sameRow.length >= 2 || sameCol.length >= 2;
});

/**
 * Condition: Checks if the triggering action came from a specific trait type.
 * This allows traits to react only to specific types of allied actions.
 * Requires `traitId` parameter in `conditionData`.
 * 
 * Example usage: React only when an ally uses a "deal_damage" trait vs a "heal" trait.
 */
registerTraitConditionImplementation("allied_action_trait_is", (context, conditionData) => {
	const expectedTraitId = conditionData.traitId as string;
	if (!expectedTraitId) {
		if (process.env.NODE_ENV === 'development') {
			console.error(`'allied_action_trait_is' condition is missing 'traitId' parameter.`, { conditionData });
		}
		return false;
	}

	// Check for triggering trait context stored temporarily in the scene
	const triggerContext = (context.scene as any)._currentTriggerContext;
	if (!triggerContext) {
		return false; // No trigger context available
	}

	return triggerContext.triggeringTraitId === expectedTraitId;
});

/**
 * Condition: Checks if the triggering action was a specific type of action.
 * This allows traits to react only to specific types of allied actions.
 * Requires `action` parameter in `conditionData` ('attack', 'heal', 'buff', etc.).
 * 
 * Example usage: React only when an ally attacks vs when they heal.
 */
registerTraitConditionImplementation("allied_action_type_is", (context, conditionData) => {
	const expectedAction = conditionData.action as string;
	if (!expectedAction) {
		if (process.env.NODE_ENV === 'development') {
			console.error(`'allied_action_type_is' condition is missing 'action' parameter.`, { conditionData });
		}
		return false;
	}

	// Check for triggering action context stored temporarily in the scene
	const triggerContext = (context.scene as any)._currentTriggerContext;
	if (!triggerContext) {
		return false; // No trigger context available
	}

	return triggerContext.triggeringAction === expectedAction;
});

/**
 * Condition: Checks if the triggering action was a specific action ID.
 * This allows traits to react only to specific action IDs like "damage", "heal", "shield", etc.
 * Requires `actionId` parameter in `conditionData`.
 * 
 * Example usage: React only when an ally uses "damage" action vs "heal" action.
 */
registerTraitConditionImplementation("allied_action_id_is", (context, conditionData) => {
	const expectedActionId = conditionData.actionId as string;
	if (!expectedActionId) {
		if (process.env.NODE_ENV === 'development') {
			console.error(`'allied_action_id_is' condition is missing 'actionId' parameter.`, { conditionData });
		}
		return false;
	}

	// Check for triggering action context stored temporarily in the scene
	const triggerContext = (context.scene as any)._currentTriggerContext;
	if (!triggerContext) {
		return false; // No trigger context available
	}

	return triggerContext.triggeringActionId === expectedActionId;
});

// --- Helper Functions for Allied Reaction Processing ---

// --- Helper Functions for Allied Reaction Processing ---

/**
 * Determines which units should react to an action and sets up trigger context.
 * Returns a function that can be called to process each reactor's traits.
 * This avoids circular dependency issues by not directly importing processUnitTraitsForEvent.
 * 
 * @param actionUnit The unit performing the action that might trigger reactions
 * @param actionTraitId The ID of the trait being executed
 * @param actionType The type of action ('attack', 'heal', 'buff', etc.)
 * @param actionId The specific action ID ('damage', 'heal', 'shield', etc.)
 * @param sourceSelector The selector determining which allies can react (defaults to 'all_allies')
 * @param scene The battle scene
 * @param state The game state
 * @returns A function that takes processUnitTraitsForEvent and executes the reactions
 */
export function setupAlliedReactions(
	actionUnit: Unit,
	actionTraitId: string,
	actionType: string,
	actionId: string,
	sourceSelector: string = 'all_allies',
	scene: BattlegroundScene,
	state: State
): (processTraits: (unit: Unit, event: string, scene: BattlegroundScene, state: State) => void) => void {
	// Use the existing target resolution system to determine which units should react
	const potentialReactors = resolveTargets(
		actionUnit,
		actionUnit.force,
		sourceSelector,
		state,
		scene
	);

	return (processUnitTraitsForEvent) => {
		// Process traits for each potential reactor
		potentialReactors.forEach((reactorUnit) => {
			// Set up trigger context for condition checking
			const originalTriggerContext = (scene as any)._currentTriggerContext;
			(scene as any)._currentTriggerContext = {
				triggeringTraitId: actionTraitId,
				triggeringUnitId: actionUnit.id,
				triggeringAction: actionType,
				triggeringActionId: actionId
			};

			// Process the reactor's traits that respond to allied actions
			processUnitTraitsForEvent(reactorUnit, "onAlliedAction", scene, state);

			// Restore original context
			(scene as any)._currentTriggerContext = originalTriggerContext;
		});
	};
}

// --- Parameter-to-Effect Resolution ---

/**
 * Converts trait instance parameters to a target selector string.
 * This enables the simplified parametric trait system where instead of having separate
 * trait definitions like "ally_left", "ally_right", etc., we have a single "boost_power"
 * trait that accepts a "targets" parameter.
 */
export function resolveTargetSelectorFromParams(
	traitInstanceParams: TraitData,
	effectInstance: TraitEffectInstanceData
): string {
	// If effect instance has explicit targetSelector, use it (backward compatibility)
	if (effectInstance.targetSelector) {
		return effectInstance.targetSelector;
	}

	// Check trait instance parameters for target specification
	const targets = traitInstanceParams.targets;
	if (typeof targets === 'string') {
		// Map simplified target names to full selector strings
		switch (targets) {
			case 'left':
				return 'ally_left';
			case 'right':
				return 'ally_right';
			case 'back':
			case 'behind':
				return 'ally_back';
			case 'front':
				return 'ally_front';
			case 'adjacent':
				return 'allies_adjacent';
			case 'diagonal':
				return 'allies_diagonal';
			case 'row':
				return 'all_allies_in_row';
			case 'column':
				return 'all_allies_in_column';
			case 'all_allies':
			case 'all':
				return 'all_allies';
			case 'enemy':
			case 'closest_enemy':
				return 'closest_enemy';
			case 'all_enemies':
				return 'enemy_guild';
			default:
				return targets; // Assume it's already a valid selector
		}
	}

	// Default to self if no targets specified
	return 'self';
}

/**
 * Converts trait instance parameters to condition instances.
 * This enables the simplified parametric trait system where instead of having separate
 * trait definitions with hardcoded conditions, we use parameters to dynamically create conditions.
 */
export function resolveConditionsFromParams(
	traitInstanceParams: TraitData,
	effectInstance: TraitEffectInstanceData
): TraitConditionInstanceData[] {
	const conditions: TraitConditionInstanceData[] = [];

	// Start with any explicit conditions from the effect instance (backward compatibility)
	if (effectInstance.conditions) {
		conditions.push(...effectInstance.conditions);
	}

	// Add conditions based on trait instance parameters
	const position = traitInstanceParams.position;
	if (typeof position === 'string') {
		switch (position) {
			case 'front':
			case 'mid':
			case 'back':
				conditions.push({
					type: 'is_in_row',
					row: position
				});
				break;
			case 'left':
			case 'right':
				conditions.push({
					type: 'is_in_column',
					column: position
				});
				break;
			case 'center':
				conditions.push({
					type: 'is_in_center'
				});
				break;
			case 'corner':
				conditions.push({
					type: 'is_in_corner'
				});
				break;
			case 'edge':
				conditions.push({
					type: 'is_on_edge'
				});
				break;
			case 'isolated':
				conditions.push({
					type: 'has_no_adjacent_allies'
				});
				break;
		}
	}

	return conditions;
}
