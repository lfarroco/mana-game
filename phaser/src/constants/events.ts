export const GameEvents = {
	GOLD_CHANGED: "gold_changed",
	/**
	 * Emitted when the battle wave setup is complete, before the first tick of combat.
	 * Units, relics and other systems can listen to this to apply battle-start effects.
	 */
	BATTLE_START_SETUP_COMPLETE: "battle_start_setup_complete",

	// Trait System Specific Triggers
	TRAIT_EVAL_UNIT_ACTION: "trait_eval_unit_action",
	TRAIT_EVAL_GLOBAL_BATTLE_START: "trait_eval_global_battle_start", // For all units & relics
	TRAIT_EVAL_BATTLE_END: "trait_eval_battle_end",
	TRAIT_EVAL_TURN_START: "trait_eval_turn_start",
	TRAIT_EVAL_ALLIED_ACTION: "trait_eval_allied_action",
	TRAIT_EVAL_TURN_END: "trait_eval_turn_end",
	TRAIT_EVAL_ENEMY_KILLED: "trait_eval_enemy_killed",
	TRAIT_EVAL_ALLIED_KILLED: "trait_eval_allied_killed",
	TRAIT_EVAL_UNIT_KILLED: "trait_eval_unit_killed",
	TRAIT_EVAL_UNIT_KILL: "trait_eval_unit_kil",
	TRAIT_EVAL_UNIT_ENTER_POSITION: "trait_eval_unit_enter_position",
	TRAIT_EVAL_UNIT_LEAVE_POSITION: "trait_eval_unit_leave_position",
	TRAIT_EVAL_UNIT_HALF_HP: "trait_eval_unit_half_hp",
	TRAIT_EVAL_UNIT_DEATH: "trait_eval_unit_death",
	TRAIT_EVAL_ATTACK_BY_ME: "trait_eval_attack_by_me",
	TRAIT_EVAL_DEFEND_BY_ME: "trait_eval_defend_by_me",
	TRAIT_EVAL_EVADE_BY_ME: "trait_eval_evade_by_me",
	TRAIT_EVAL_AFTER_ATTACK_BY_ME: "trait_eval_after_attack_by_me",
	// Add other specific triggers as needed, e.g., for kill events
	TRAIT_EVAL_UNIT_KILL_BY_ME: "trait_eval_unit_kill_by_me",
};