import { ActionMetadata, ActionType, } from "./types";

/**
 * Registry of all known actions and their metadata.
 * Controls how actions affect the phase, step, and round state.
 */
export class ActionRegistry {
	private registry: Record<string, ActionMetadata> = {
		// Meta Actions
		'discard_unit': { type: ActionType.META_ACTION, description: 'Remove a unit from the team' },

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

	/**
	 * Get metadata for an action.
	 */
	public get(actionId: string): ActionMetadata | undefined {
		return this.registry[actionId];
	}

	/**
	 * Register a new action or overwrite an existing one.
	 */
	public register(actionId: string, metadata: ActionMetadata): void {
		this.registry[actionId] = metadata;
	}

	/**
	 * Determine the type of an action.
	 * If not found in registry, attempts to infer type.
	 */
	public getActionType(actionId: string): ActionType {
		const meta = this.get(actionId);
		if (meta) {
			return meta.type;
		}

		// Default fallback for unknown actions (likely card selections in encounter/shop)
		// If it's a card ID, it's usually a transition
		// But since we can't easily import the card catalog here without circular deps,
		// we assume unknown actions map to transitions if they aren't explicitly other types.
		return ActionType.PHASE_TRANSITION;
	}

	/**
	 * Check if an action is a meta action (doesn't advance phase).
	 */
	public isMetaAction(actionId: string): boolean {
		return this.getActionType(actionId) === ActionType.META_ACTION;
	}

	/**
	 * Check if action is a sub-phase action (modifies state within phase).
	 */
	public isSubPhaseAction(actionId: string): boolean {
		return this.getActionType(actionId) === ActionType.SUB_PHASE;
	}
}

export const actionRegistry = new ActionRegistry();
