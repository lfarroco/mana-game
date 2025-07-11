export const GameEvents = {
	GOLD_CHANGED: "gold_changed",
	/**
	 * Emitted when the battle wave setup is complete, before the first tick of combat.
	 * Units and other systems can listen to this to apply battle-start effects.
	 */
	BATTLE_START_SETUP_COMPLETE: "battle_start_setup_complete",

	// Shop / Unit Acquisition Events
	UNIT_PURCHASED: "unit_purchased",
	PURCHASE_FAILED: "purchase_failed", // Payload: { unitName: string, reason: string, cost?: number }
	SHOP_PHASE_ENDED: "shop_phase_ended",

	// Combat Flow Events
	COMBAT_ENDED_VICTORY: "combat_ended_victory", // Payload: { enemiesDefeated: Unit[] }
	COMBAT_ENDED_DEFEAT: "combat_ended_defeat",

	//UNIT_TOOK_HIT: "unit_took_hit", // Payload: { unit: Unit, damage: number }
	UNIT_ATTACK: "unit_attack", // Payload: { unit: Unit }
	UNIT_SHIELD_GAINED: "unit_shield_gained", // Payload: { unit: Unit, amount: number }
	UNIT_MORALE_RESTORED: "unit_morale_restored", // Payload: { unit: Unit, amount: number }

	// Trait System Specific Triggers
	TRAIT_EVAL_UNIT_ACTION: "trait_eval_unit_action",
	TRAIT_EVAL_GLOBAL_BATTLE_START: "trait_eval_global_battle_start", // For all units
	TRAIT_EVAL_BATTLE_END: "trait_eval_battle_end",
	TRAIT_EVAL_TURN_START: "trait_eval_turn_start",
	TRAIT_EVAL_ALLIED_ACTION: "trait_eval_allied_action",
	TRAIT_EVAL_TURN_END: "trait_eval_turn_end",
	TRAIT_EVAL_ATTACK_BY_ME: "trait_eval_attack_by_me",

	// BattlegroundScene specific UI and System Triggers
	PLAYER_GOLD_DELTA_REQUEST: "player_delta_update_request", // Payload: number (goldDelta)
	PLAYER_BOARD_CREATE_DROP_ZONE: "player_board_create_drop_zone",
	PLAYER_BOARD_SHOW: "player_board_show",
	PLAYER_BOARD_HIDE: "player_board_hide",
	UI_MAIN_CREATE: "ui_main_create",
	CHARA_SUMMON_TO_BOARD: "chara_summon_to_board", // Payload: { unit: Unit, animateAppear: boolean, playSound: boolean }
	CHARA_DESTROY_FROM_BOARD: "chara_destroy_from_board", // Payload: { unitId: string }
	POP_TEXT_SHOW: "pop_text_show", // Payload: PopTextPayload from EventPayloads.ts
	CHARA_CHARGE_BAR_UPDATE: "chara_charge_bar_update", // Payload: { unitId: string }
	CHARA_BARS_VISIBILITY_SET: "chara_bars_visibility_set", // Payload: { unitId: string, visible: boolean }
	BATTLE_RESULT_SHOW: "battle_result_show", // Payload: { result: "victory" | "defeat" }
	CHARA_POINTER_OVER: "chara_pointer_over", // Payload: { charaId: string }
	CHARA_POINTER_OUT: "chara_pointer_out", // Payload: { charaId: string }
	VIGNETTE_MESSAGE_SHOW: "vignette_message_show", // Payload: { message: string }
	SHOP_OPEN_UI_TRIGGER: "shop_open_ui_trigger",

	MORALE_BARS_SHOW: "morale_bars_show",
	MORALE_BARS_HIDE: "morale_bars_hide",
	MORALE_UPDATED: "morale_updated", // Payload: { forceId: string, newMorale: number, maxMorale: number }

	SHIELD_BARS_SHOW: "shield_bars_show",
	SHIELD_BARS_HIDE: "shield_bars_hide",
	SHIELD_UPDATED: "shield_updated", // Payload: { forceId: string, newShield: number, maxShield: number }

	COMBAT_START_EXECUTION_TRIGGER: "combat_start_execution_trigger", // Payload: { enemies: Unit[] }
	GAME_OVER_SHOW_UI_TRIGGER: "game_over_show_ui_trigger",

	// UI System Events
	USER_MESSAGE_REQUESTED: "user_message_requested", // Payload: UserMessagePayload
	TOOLTIP_SHOW: "tooltip_show", // Payload: { x: number, y: number, title: string, description: string }
	TOOLTIP_HIDE: "tooltip_hide",

	// Shop Interaction Requests (emitted by Chara when it's a shop item)
	SHOP_ITEM_CLICK_PURCHASE_REQUESTED: "shop_item_click_purchase_requested", // Payload: { shopUnitData: Unit, shopCharaId: string, dragStartX: number, dragStartY: number }
	SHOP_ITEM_DRAG_PURCHASE_REQUESTED: "shop_item_drag_purchase_requested",   // Payload: { shopUnitData: Unit, shopCharaId: string, targetTile: Vec2, dragStartX: number, dragStartY: number }

	// Owned Unit Move Requests (emitted by Chara when it's an owned unit)
	OWNED_UNIT_MOVE_REQUESTED: "owned_unit_move_requested", // Payload: { unitId: string, targetTile: Vec2, dragStartX: number, dragStartY: number }

	// Outcome Events (emitted by the system handling the request)
	SHOP_PURCHASE_SUCCESSFUL: "shop_purchase_successful", // Payload: { purchasedUnit: Unit, originalShopCharaId: string }
	SHOP_PURCHASE_FAILED: "shop_purchase_failed",         // Payload: { originalShopCharaId: string, reason: string, dragStartX: number, dragStartY: number } (also updates existing PURCHASE_FAILED)

	OWNED_UNIT_MOVE_ACCEPTED: "owned_unit_move_accepted", // Payload: { unitId: string, newPosition: Vec2, newVisualPosition: {x,y} }
	OWNED_UNIT_SWAP_ACCEPTED: "owned_unit_swap_accepted",   // Payload: { movedUnitId: string, movedUnitNewPos: Vec2, movedUnitVisualPos: {x,y}, swappedUnitId: string, swappedUnitNewPos: Vec2, swappedUnitVisualPos: {x,y} }
	OWNED_UNIT_MOVE_REJECTED: "owned_unit_move_rejected", // Payload: { unitId: string, reason: string, dragStartX: number, dragStartY: number }

	// Event for CharaManager to spawn a new Chara on the board
	BOARD_CHARA_CREATE_REQUESTED: "board_chara_create_requested", // Payload: { unit: Unit }

	// Prestige System Events
	PRESTIGE_CHANGED: "prestige_changed", // Payload: newTotalPrestige: number, prestigeDelta: number

	OWNED_UNIT_SOLD: "owned_unit_sold", // Payload: { unitId: string, soldForGold: number }
	ROUND_ENDED_UPDATE_STATS: "round_ended_update_stats",// Payload: {totalRounds: number, currentPrestige: number }
	PLAYER_WON_GAME: "player_won_game",

	DIFFICULTY_TIER_CHANGED: "difficulty_tier_changed", // Payload: { difficultyTier: DifficultyTier }


};