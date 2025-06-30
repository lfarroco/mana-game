import { UIManager } from "../../../UI/UIManager";
import { PlayerBoard, createBoardDropZone } from "../../../Models/Board";
import { Shop } from "./Shop/Shop";
import * as CharaManager from "./CharaManager"; // Keep CharaManager import
import { GameEvents } from "../../../constants/events";
import { BattlegroundScene } from "../BattlegroundScene";
import { popText } from "../../../Systems/Chara/Animations/popText";
import { PopTextPayload } from "../../../Models/EventPayloads";
import * as MoraleDisplay from "../MoraleDisplay";
import * as VignetteSystem from "../Animations/vignette";

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
 * - Subscribes to a wide array of `GameEvents` (e.g., unit attacks, phase transitions, UI updates, player actions).
 * - Delegates event handling to appropriate systems (`BattleProgressionSystem`, `CharaManager`, `UIManager`, `Shop`, etc.) or handles them directly.
 * - Manages the lifecycle of its event listeners, registering them on creation and unregistering them on destruction.
 */
export class BattlegroundEventSystem {
	scene: BattlegroundScene;
	uiManager: UIManager;
	playerBoard: PlayerBoard;
	shop: Shop;
	listeners: Listener[] = [];

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
		this.uiManager = scene.uiManager;
		this.playerBoard = scene.playerBoard;
		this.shop = scene.shop;
	}

	addListener(event: string, handler: (...args: any[]) => void, context?: any): void {
		this.scene.events.on(event, handler, context);
		this.listeners.push({ event, handler, context });
	}

	private initializeMoraleDisplay(): void {
		MoraleDisplay.init(this.scene);
		this.addListener(GameEvents.MORALE_BARS_SHOW, MoraleDisplay.showBars);
		this.addListener(GameEvents.MORALE_BARS_HIDE, MoraleDisplay.hideBars);
	}

	private initializeVignetteSystem(): void {
		VignetteSystem.init(this.scene);
	}

	registerEventHandlers(): void {
		const eventMappings = [
			// Game Lifecycle & Phase Transitions
			{ event: GameEvents.GAME_OVER_SHOW_UI_TRIGGER, handler: () => console.warn("Not implemented"), context: this.uiManager },

			// Player State
			{ event: GameEvents.PLAYER_GOLD_DELTA_REQUEST, handler: this.scene.handlePlayerGoldUpdateRequest, context: this.scene },

			// Board & UI Setup/Visibility
			{ event: GameEvents.PLAYER_BOARD_CREATE_DROP_ZONE, handler: createBoardDropZone },
			{ event: GameEvents.PLAYER_BOARD_SHOW, handler: this.playerBoard.display, context: this.playerBoard },
			{ event: GameEvents.PLAYER_BOARD_HIDE, handler: this.playerBoard.hide, context: this.playerBoard },
			{ event: GameEvents.UI_MAIN_CREATE, handler: this.uiManager.createMainUI, context: this.uiManager },

			// Chara Lifecycle & Visuals
			{ event: GameEvents.CHARA_SUMMON_TO_BOARD, handler: CharaManager.handleSummonCharaToBoardEvent },
			{ event: GameEvents.CHARA_DESTROY_FROM_BOARD, handler: CharaManager.handleDestroyCharaFromBoardEvent },
			{ event: GameEvents.CHARA_CHARGE_BAR_UPDATE, handler: CharaManager.handleCharaChargeBarUpdateEvent },
			{ event: GameEvents.CHARA_BARS_VISIBILITY_SET, handler: CharaManager.handleCharaBarsVisibilitySetEvent },

			// Visual Effects & Feedback
			{ event: GameEvents.POP_TEXT_SHOW, handler: (payload: PopTextPayload) => popText({ scene: this.scene, x: payload.x, y: payload.y, text: payload.text, type: payload.type }), context: this },
			{ event: GameEvents.BATTLE_RESULT_SHOW, handler: this.scene.handleBattleResultShow, context: this.scene },

			// Shop Interactions
			{ event: GameEvents.SHOP_OPEN_UI_TRIGGER, handler: this.shop.handleShopOpenUITrigger, context: this.shop },
		];

		eventMappings.forEach(({ event, handler, context }) => {
			this.addListener(event, handler, context);
		});

		this.initializeMoraleDisplay();
		this.initializeVignetteSystem();
	}

	destroy(): void {
		this.listeners.forEach(listener => {
			this.scene.events.off(listener.event, listener.handler, listener.context);
		});
		this.listeners = [];
		MoraleDisplay.destroy();
	}
}