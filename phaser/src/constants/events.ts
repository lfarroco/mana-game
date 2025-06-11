export const GameEvents = {
	GOLD_CHANGED: "gold_changed",
	/**
	 * Emitted when the battle wave setup is complete, before the first tick of combat.
	 * Units, relics and other systems can listen to this to apply battle-start effects.
	 */
	BATTLE_START_SETUP_COMPLETE: "battle_start_setup_complete",

	// Shop / Unit Acquisition Events
	UNIT_PURCHASED: "unit_purchased",
	PURCHASE_FAILED: "purchase_failed", // Payload: { unitName: string, reason: string, cost?: number }
	SHOP_PHASE_ENDED: "shop_phase_ended",

	// Combat Flow Events
	COMBAT_ENDED_VICTORY: "combat_ended_victory", // Payload: { enemiesDefeated: Unit[] }
	COMBAT_ENDED_DEFEAT: "combat_ended_defeat",

	UNIT_DIED_IN_BATTLE: "unit_died_in_battle", // Payload: { unit: Unit, killerId?: string }

	// Trait System Specific Triggers
	TRAIT_EVAL_UNIT_ACTION: "trait_eval_unit_action",
	TRAIT_EVAL_GLOBAL_BATTLE_START: "trait_eval_global_battle_start", // For all units & relics
	TRAIT_EVAL_BATTLE_END: "trait_eval_battle_end",
	TRAIT_EVAL_TURN_START: "trait_eval_turn_start",
	TRAIT_EVAL_ALLIED_ACTION: "trait_eval_allied_action",
	TRAIT_EVAL_TURN_END: "trait_eval_turn_end",
	TRAIT_EVAL_ENEMY_KILLED: "trait_eval_enemy_killed",
	TRAIT_EVAL_ALLIED_KILLED: "trait_eval_allied_killed",
	TRAIT_EVAL_UNIT_KILL: "trait_eval_unit_kill", // Corrected typo from _kil to _kill
	TRAIT_EVAL_UNIT_ENTER_POSITION: "trait_eval_unit_enter_position",
	TRAIT_EVAL_UNIT_LEAVE_POSITION: "trait_eval_unit_leave_position",
	TRAIT_EVAL_UNIT_HALF_HP: "trait_eval_unit_half_hp",
	TRAIT_EVAL_UNIT_DEATH: "trait_eval_unit_death",
	TRAIT_EVAL_ATTACK_BY_ME: "trait_eval_attack_by_me",
	TRAIT_EVAL_DEFEND_BY_ME: "trait_eval_defend_by_me",
	TRAIT_EVAL_EVADE_BY_ME: "trait_eval_evade_by_me",
	TRAIT_EVAL_AFTER_ATTACK_BY_ME: "trait_eval_after_attack_by_me",
	TRAIT_EVAL_UNIT_KILL_BY_ME: "trait_eval_unit_kill_by_me",

	// BattlegroundScene specific UI and System Triggers
	PLAYER_GOLD_UPDATE_REQUEST: "player_gold_update_request", // Payload: number (goldDelta)
	PLAYER_BOARD_CREATE_DROP_ZONE: "player_board_create_drop_zone",
	PLAYER_BOARD_SHOW: "player_board_show",
	PLAYER_BOARD_HIDE: "player_board_hide",
	UI_MAIN_CREATE: "ui_main_create",
	RELIC_SLOTS_SETUP: "relic_slots_setup",
	CHARA_SUMMON_TO_BOARD: "chara_summon_to_board", // Payload: { unit: Unit, animateAppear: boolean, playSound: boolean }
	CHARA_DESTROY_FROM_BOARD: "chara_destroy_from_board", // Payload: { unitId: string }
	POP_TEXT_SHOW: "pop_text_show", // Payload: { text: string, targetId: string, color?: string }
	CHARA_HP_DISPLAY_UPDATE: "chara_hp_display_update", // Payload: { unitId: string }
	CHARA_CHARGE_BAR_UPDATE: "chara_charge_bar_update", // Payload: { unitId: string }
	CHARA_BARS_VISIBILITY_SET: "chara_bars_visibility_set", // Payload: { unitId: string, visible: boolean }
	BATTLE_RESULT_SHOW: "battle_result_show", // Payload: { result: "victory" | "defeat" }
	VIGNETTE_MESSAGE_SHOW: "vignette_message_show", // Payload: { message: string }
	SHOP_OPEN_UI_TRIGGER: "shop_open_ui_trigger",
	COMBAT_START_EXECUTION_TRIGGER: "combat_start_execution_trigger", // Payload: { enemies: Unit[] }
	GAME_OVER_SHOW_UI_TRIGGER: "game_over_show_ui_trigger",

	// UI System Events
	USER_MESSAGE_REQUESTED: "user_message_requested", // Payload: UserMessagePayload
};