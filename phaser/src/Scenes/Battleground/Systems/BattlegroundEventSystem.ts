import { UIManager } from "../../../UI/UIManager";
import { PlayerBoard, createBoardDropZone } from "../../../Models/Board";
import { Shop } from "./Shop/Shop";
import { BattleProgressionSystem } from "./BattleProgressionSystem";
import * as CharaManager from "./CharaManager"; // Keep CharaManager import
import * as Relic from "./Relic";
import { GameEvents } from "../../../constants/events";
import { BattlegroundScene } from "../BattlegroundScene";
import { handleCharaDeath } from "../../../Systems/Chara/CharaDeathSequenceHandler";
import { Chara } from "../../../Systems/Chara/Chara";
import { popText } from "../../../Systems/Chara/Animations/popText";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../../constants/constants";
import { PopTextPayload } from "../../../Models/EventPayloads";
import * as CharaTooltip from "../../../Systems/Chara/CharaTooltip";

type Listener = {
	event: string;
	handler: (...args: any[]) => void;
	context?: any;
};

/**
 * @class BattlegroundEventSystem
 * @description
 * Manages and centralizes the handling of game-specific events within the BattlegroundScene.
 *
 * **Goal:**
 * To act as the primary dispatcher for `GameEvents`, ensuring that different game systems
 * and UI components react appropriately to in-game occurrences, thereby decoupling event
 * emitters from direct knowledge of event consumers.
 *
 * **Purpose:**
 * - Subscribes to a wide array of `GameEvents` (e.g., unit death, phase transitions, UI updates, player actions).
 * - Delegates event handling to appropriate systems (`BattleProgressionSystem`, `CharaManager`, `UIManager`, `Shop`, etc.) or handles them directly.
 * - Manages the lifecycle of its event listeners, registering them on creation and unregistering them on destruction.
 */
export class BattlegroundEventSystem {
	scene: BattlegroundScene;
	uiManager: UIManager;
	playerBoard: PlayerBoard;
	shop: Shop;
	battleProgressionSystem: BattleProgressionSystem;
	listeners: Listener[] = [];

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
		this.uiManager = scene.uiManager;
		this.playerBoard = scene.playerBoard;
		this.shop = scene.shop;
		this.battleProgressionSystem = scene.battleProgressionSystem;
	}

	addListener(event: string, handler: (...args: any[]) => void, context?: any): void {
		this.scene.events.on(event, handler, context);
		this.listeners.push({ event, handler, context });
	}

	registerEventHandlers(): void {
		// Game Lifecycle & Phase Transitions
		this.addListener(GameEvents.SHOP_PHASE_ENDED, this.battleProgressionSystem.handleShopPhaseEnded, this.battleProgressionSystem);
		this.addListener(GameEvents.COMBAT_ENDED_VICTORY, this.battleProgressionSystem.handleCombatEndedVictory, this.battleProgressionSystem);
		this.addListener(GameEvents.COMBAT_ENDED_DEFEAT, this.battleProgressionSystem.handleCombatEndedDefeat, this.battleProgressionSystem);
		this.addListener(GameEvents.COMBAT_START_EXECUTION_TRIGGER, this.battleProgressionSystem.handleCombatStartExecution, this.battleProgressionSystem);
		this.addListener(GameEvents.GAME_OVER_SHOW_UI_TRIGGER, () => {
			console.warn("Not implemented")
		}, this.uiManager);

		// Player State
		this.addListener(GameEvents.PLAYER_GOLD_DELTA_REQUEST, this.scene.handlePlayerGoldUpdateRequest, this.scene);

		this.addListener(GameEvents.PLAYER_WON_GAME, this.battleProgressionSystem.handlePlayerWonGame, this);

		// Board & UI Setup/Visibility
		this.addListener(GameEvents.PLAYER_BOARD_CREATE_DROP_ZONE, createBoardDropZone); // No context needed
		this.addListener(GameEvents.PLAYER_BOARD_SHOW, this.playerBoard.display, this.playerBoard);
		this.addListener(GameEvents.PLAYER_BOARD_HIDE, this.playerBoard.hide, this.playerBoard);
		this.addListener(GameEvents.UI_MAIN_CREATE, this.uiManager.createMainUI, this.uiManager);
		this.addListener(GameEvents.RELIC_SLOTS_SETUP, () => Relic.setupRelicSlots(this.scene), this);

		// Chara Lifecycle & Visuals
		this.addListener(GameEvents.CHARA_SUMMON_TO_BOARD, CharaManager.handleSummonCharaToBoardEvent);
		this.addListener(GameEvents.CHARA_DESTROY_FROM_BOARD, CharaManager.handleDestroyCharaFromBoardEvent);
		this.addListener(GameEvents.CHARA_HP_DISPLAY_UPDATE, CharaManager.handleCharaHpDisplayUpdateEvent);
		this.addListener(GameEvents.CHARA_CHARGE_BAR_UPDATE, CharaManager.handleCharaChargeBarUpdateEvent);
		this.addListener(GameEvents.CHARA_BARS_VISIBILITY_SET, CharaManager.handleCharaBarsVisibilitySetEvent);
		this.addListener(GameEvents.UNIT_DIED_IN_BATTLE, this.battleProgressionSystem.handleUnitDiedInBattle, this.battleProgressionSystem);
		this.addListener(GameEvents.CHARA_FATALLY_WOUNDED, (data: { chara: Chara, killerId: string }) => handleCharaDeath(this.scene, data), this);

		// Visual Effects & Feedback
		this.addListener(GameEvents.POP_TEXT_SHOW, (payload: PopTextPayload) => {
			popText({ scene: this.scene, x: payload.x, y: payload.y, text: payload.text, type: payload.type });
		}, this);
		this.addListener(GameEvents.BATTLE_RESULT_SHOW, this.scene.handleBattleResultShow, this.scene);
		this.addListener(GameEvents.VIGNETTE_MESSAGE_SHOW, this.scene.handleVignetteMessageShow, this.scene);

		// Shop Interactions
		this.addListener(GameEvents.SHOP_OPEN_UI_TRIGGER, this.shop.handleShopOpenUITrigger, this.shop);
		this.addListener(GameEvents.SHOP_ITEM_CLICK_PURCHASE_REQUESTED, this.shop.handleShopItemClickPurchaseRequested, this.shop);
		this.addListener(GameEvents.SHOP_ITEM_DRAG_PURCHASE_REQUESTED, this.shop.handleShopItemDragPurchaseRequested, this.shop);

		// Unit Placement & Movement
		this.addListener(GameEvents.OWNED_UNIT_MOVE_REQUESTED, this.scene.handleOwnedUnitMoveRequest, this.scene);
		this.addListener(GameEvents.BOARD_CHARA_CREATE_REQUESTED, this.scene.handleBoardCharaCreateRequest, this.scene);
		this.addListener(GameEvents.OWNED_UNIT_SOLD, this.scene.handleOwnedUnitSold, this.scene);
		this.addListener(GameEvents.OWNED_RELIC_SOLD, this.scene.handleOwnedRelicSold, this.scene);

		// Tooltips (keeping direct calls as they are simple and UI related)
		this.addListener(GameEvents.CHARA_POINTER_OVER, CharaTooltip.onCharaPointerOver, this); // Context `this` is fine if onCharaPointerOver doesn't rely on CharaTooltip's `this`
		this.addListener(GameEvents.CHARA_POINTER_OUT, CharaTooltip.onCharaPointerOut, this); // Same as above

		// Morale UI
		this.addListener(GameEvents.MORALE_BARS_SHOW, this.handleMoraleBarsShow, this);
		this.addListener(GameEvents.MORALE_BARS_HIDE, this.handleMoraleBarsHide, this);
		this.addListener(GameEvents.MORALE_UPDATED, this.handleMoraleUpdated, this);
	}

	private handleMoraleBarsShow(): void {
		this.scene.playerMoraleBar?.setVisible(true);
		this.scene.cpuMoraleBar?.setVisible(true);
	}

	private handleMoraleBarsHide(): void {
		this.scene.playerMoraleBar?.setVisible(false);
		this.scene.cpuMoraleBar?.setVisible(false);
	}

	private handleMoraleUpdated(payload: { forceId: string, newMorale: number, maxMorale: number }): void {
		if (payload.forceId === FORCE_ID_PLAYER) {
			this.scene.playerMoraleBar?.updateMorale(payload.newMorale, payload.maxMorale);
		} else if (payload.forceId === FORCE_ID_CPU) {
			this.scene.cpuMoraleBar?.updateMorale(payload.newMorale, payload.maxMorale);
		}
	}

	destroy(): void {
		this.listeners.forEach(listener => {
			this.scene.events.off(listener.event, listener.handler, listener.context);
		});
		this.listeners = [];
	}
}