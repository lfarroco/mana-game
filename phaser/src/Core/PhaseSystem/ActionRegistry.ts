import { ActionMetadata, ActionType } from "./types";

type ActionRegistryState = Record<string, ActionMetadata>;

const initialRegistry: ActionRegistryState = {
	// Meta Actions
	'discard_unit': { type: ActionType.META_ACTION, description: 'Remove a unit from the team' },
	'update_team': { type: ActionType.META_ACTION, description: 'Update team composition' },

	// Special Orb Encounters -> Orb Shop
	'upgrade_unit': { type: ActionType.PHASE_TRANSITION, toPhase: 'orb_shop', description: 'Enter orb shop to upgrade unit' },
	'power_distributor': { type: ActionType.PHASE_TRANSITION, toPhase: 'orb_shop', description: 'Enter orb shop for power distributor' },
	'power_absorber': { type: ActionType.PHASE_TRANSITION, toPhase: 'orb_shop', description: 'Enter orb shop for power absorber' },

	// Orb Shop Actions
	'apply_orb': { type: ActionType.SUB_PHASE, description: 'Apply an orb to a unit' },
	'orb_shop_done': { type: ActionType.PHASE_TRANSITION, fromPhase: 'orb_shop', description: 'Leave orb shop' },

	// Encounter Select
	'skip_encounter': { type: ActionType.PHASE_SKIP, fromPhase: 'encounter', toPhase: 'shop', description: 'Skip selecting an encounter' },
	'combat_encounter': { type: ActionType.PHASE_TRANSITION, fromPhase: 'encounter', toPhase: 'combat', description: 'Start combat' },
	// Note: Regular encounters (card IDs) are not explicitly listed but transition to 'shop'

	// Shop Actions
	'skip_shop': { type: ActionType.PHASE_SKIP, fromPhase: 'shop', description: 'Leave shop without buying' },
	'phase_complete': { type: ActionType.PHASE_TRANSITION, description: 'Generic phase completion' },
	// Note: Buying a card (card ID) transitions from 'shop' to next phase (encounter or combat)

	// Combat Actions
	'combat_done': { type: ActionType.PHASE_TRANSITION, fromPhase: 'combat', description: 'Finish combat summary' },

	// Upgrade Actions
	'upgrade_core_done': { type: ActionType.PHASE_TRANSITION, fromPhase: 'upgrade_core', description: 'Finish upgrade phase' },
	'add_reaction_core_done': { type: ActionType.PHASE_TRANSITION, fromPhase: 'add_reaction_core', description: 'Finish reaction phase' },

	// Specific Upgrade Options (imply transition)
	'increase_core_max_life': { type: ActionType.PHASE_TRANSITION, fromPhase: 'upgrade_core' },
	'upgrade_core_power': { type: ActionType.PHASE_TRANSITION, fromPhase: 'upgrade_core' },
	'decrease_core_cooldown': { type: ActionType.PHASE_TRANSITION, fromPhase: 'upgrade_core' },

	// Specific Reaction Options (imply transition)
	'on_100_damage_effect': { type: ActionType.PHASE_TRANSITION, fromPhase: 'add_reaction_core' },
	'on_ally_death_effect': { type: ActionType.PHASE_TRANSITION, fromPhase: 'add_reaction_core' },
	'on_crit_effect': { type: ActionType.PHASE_TRANSITION, fromPhase: 'add_reaction_core' },
	'on_battle_start_effect': { type: ActionType.PHASE_TRANSITION, fromPhase: 'add_reaction_core' },

	// Victory / Game Over
	'return_to_menu': { type: ActionType.PHASE_TRANSITION, description: 'End game session' },
};

const registry: ActionRegistryState = { ...initialRegistry };

function get(actionId: string): ActionMetadata | undefined {
	return registry[actionId];
}

function register(actionId: string, metadata: ActionMetadata): void {
	registry[actionId] = metadata;
}

function getActionType(actionId: string): ActionType {
	const meta = get(actionId);
	if (meta) {
		return meta.type;
	}

	// Default fallback for unknown actions (likely card selections in encounter/shop)
	// If it's a card ID, it's usually a transition.
	return ActionType.PHASE_TRANSITION;
}

function isMetaAction(actionId: string): boolean {
	return getActionType(actionId) === ActionType.META_ACTION;
}

function isSubPhaseAction(actionId: string): boolean {
	return getActionType(actionId) === ActionType.SUB_PHASE;
}

function reset(): void {
	Object.keys(registry).forEach(key => delete registry[key]);
	Object.assign(registry, initialRegistry);
}

export const actionRegistry = {
	get,
	register,
	getActionType,
	isMetaAction,
	isSubPhaseAction,
	reset,
};

export type ActionRegistryApi = typeof actionRegistry;
