import { UIManager } from "../../../UI/UIManager";
import { PlayerBoard } from "../../../Models/Board";
import { Shop } from "./Shop/Shop";
import * as CharaManager from "./CharaManager"; // Keep CharaManager import
import { GameEvents } from "../../../constants/events";
import { BattlegroundScene } from "../BattlegroundScene";
import { popText } from "../../../Systems/Chara/Animations/popText";
import { PopTextPayload } from "../../../Models/EventPayloads";
import * as MoraleDisplay from "../MoraleDisplay";
import * as ShieldDisplay from "../ShieldDisplay";
import * as VignetteSystem from "../Animations/vignette";
import { onCharaPointerOver, onCharaPointerOut } from "../../../Systems/Chara/CharaTooltip";

type Listener = {
	event: string;
	handler: (...args: any[]) => void;
	context?: UIManager | PlayerBoard | Shop | BattlegroundEventSystem | undefined;
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
		// Check for duplicate listeners before adding
		const isDuplicate = this.listeners.some(
			listener => listener.event === event && listener.handler === handler && listener.context === context
		);

		if (!isDuplicate) {
			this.scene.events.on(event, handler, context);
			this.listeners.push({ event, handler, context });
		} else {
			console.warn(`Duplicate listener detected for event: ${event}`);
		}
	}

	private initializeMoraleDisplay(): void {
		try {
			MoraleDisplay.init(this.scene);
			this.addListener(GameEvents.MORALE_BARS_SHOW, MoraleDisplay.showBars);
			this.addListener(GameEvents.MORALE_BARS_HIDE, MoraleDisplay.hideBars);
			this.addListener(GameEvents.MORALE_BARS_FADE_OUT, MoraleDisplay.fadeOutBars);
		} catch (error) {
			console.error("Failed to initialize MoraleDisplay:", error);
		}
	}

	private initializeShieldDisplay(): void {
		try {
			ShieldDisplay.init(this.scene);
			this.addListener(GameEvents.SHIELD_BARS_SHOW, ShieldDisplay.showBars);
			this.addListener(GameEvents.SHIELD_BARS_HIDE, ShieldDisplay.hideBars);
			this.addListener(GameEvents.SHIELD_BARS_FADE_OUT, ShieldDisplay.fadeOutBars);
		} catch (error) {
			console.error("Failed to initialize ShieldDisplay:", error);
		}
	}

	private initializeVignetteSystem(): void {
		try {
			VignetteSystem.init(this.scene);
		} catch (error) {
			console.error("Failed to initialize VignetteSystem:", error);
		}
	}

	private initializeSystems(): void {
		this.initializeMoraleDisplay();
		this.initializeShieldDisplay();
		this.initializeVignetteSystem();
	}

	private handleGameOverShowUITrigger(): void {
		console.warn("Game over UI trigger handler is not implemented yet.");
	}

	registerEventHandlers(): void {
		const eventMappings = [
			// Game Lifecycle & Phase Transitions
			{ event: GameEvents.GAME_OVER_SHOW_UI_TRIGGER, handler: this.handleGameOverShowUITrigger, context: this.uiManager },

			// Player State
			{ event: GameEvents.PLAYER_GOLD_DELTA_REQUEST, handler: this.scene.handlePlayerGoldUpdateRequest, context: this.scene },
			{ event: GameEvents.OWNED_UNIT_MOVE_REQUESTED, handler: this.scene.handleOwnedUnitMoveRequest, context: this.scene },
			{ event: GameEvents.OWNED_UNIT_SOLD, handler: this.scene.handleOwnedUnitSold, context: this.scene },

			// Board & UI Setup/Visibility
			{ event: GameEvents.UI_MAIN_CREATE, handler: this.uiManager.createMainUI, context: this.uiManager },

			// Chara Lifecycle & Visuals
			{ event: GameEvents.BOARD_CHARA_CREATE_REQUESTED, handler: this.scene.handleBoardCharaCreateRequest, context: this.scene },
			{ event: GameEvents.CHARA_SUMMON_TO_BOARD, handler: CharaManager.handleSummonCharaToBoardEvent },
			{ event: GameEvents.CHARA_DESTROY_FROM_BOARD, handler: CharaManager.handleDestroyCharaFromBoardEvent },
			{ event: GameEvents.CHARA_CHARGE_BAR_UPDATE, handler: CharaManager.handleCharaChargeBarUpdateEvent },
			{ event: GameEvents.CHARA_BARS_VISIBILITY_SET, handler: CharaManager.handleCharaBarsVisibilitySetEvent },
			{ event: GameEvents.CHARA_POINTER_OVER, handler: onCharaPointerOver },
			{ event: GameEvents.CHARA_POINTER_OUT, handler: onCharaPointerOut },

			// Visual Effects & Feedback
			{ event: GameEvents.POP_TEXT_SHOW, handler: (payload: PopTextPayload) => popText({ scene: this.scene, x: payload.x, y: payload.y, text: payload.text, type: payload.type, direction: payload.direction }), context: this },
			{ event: GameEvents.BATTLE_RESULT_SHOW, handler: this.scene.handleBattleResultShow, context: this.scene },

			// Shop Interactions
			{ event: GameEvents.SHOP_OPEN_UI_TRIGGER, handler: this.shop.handleShopOpenUITrigger, context: this.shop },
			{ event: GameEvents.SHOP_ITEM_CLICK_PURCHASE_REQUESTED, handler: this.shop.handleShopItemClickPurchaseRequested, context: this.shop },
			{ event: GameEvents.SHOP_ITEM_DRAG_PURCHASE_REQUESTED, handler: this.shop.handleShopItemDragPurchaseRequested, context: this.shop },
		];

		eventMappings.forEach(({ event, handler, context }) => {
			this.addListener(event, handler, context);
		});

		this.initializeSystems();
	}

	destroy(): void {
		try {
			// Unregister all event listeners
			this.listeners.forEach(({ event, handler, context }) => {
				this.scene.events.off(event, handler, context);
			});

			// Clear the listeners array
			this.listeners.length = 0;

			// Clean up MoraleDisplay resources
			MoraleDisplay.destroy();

			// Clean up ShieldDisplay resources
			ShieldDisplay.destroy();

			// Additional cleanup logic can be added here if needed
		} catch (error) {
			console.error("Error during BattlegroundEventSystem destruction:", error);
		}
	}
}