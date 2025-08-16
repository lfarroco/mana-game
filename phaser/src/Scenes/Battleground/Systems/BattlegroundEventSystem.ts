import { UIManager } from "../../../UI/UIManager";
import { PartyBoard } from "../../../Models/Board";
import { Shop } from "./Shop/Shop";
import { BattlegroundScene } from "../BattlegroundScene";
import * as MoraleDisplay from "../MoraleDisplay";

type Listener = {
	event: string;
	handler: (...args: any[]) => void;
	context?: UIManager | PartyBoard | Shop | BattlegroundEventSystem | undefined;
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
	playerBoard: PartyBoard;
	shop: Shop;
	listeners: Listener[] = [];

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
		this.uiManager = scene.uiManager;
		this.playerBoard = scene.playerBoard;
		this.shop = scene.shop;
	}

	/**
	 * Shows the enemy board visuals (CPU board slots) when combat phase starts.
	 */
	handleEnemyBoardShow(): void {
		if (this.playerBoard) {
			this.playerBoard.setEnemyBoardVisible(true);
		}
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
			// Handle both morale and shield bar events since they're now combined
			// Shield bar events now go to the same combined display
		} catch (error) {
			console.error("Failed to initialize MoraleDisplay:", error);
		}
	}

	private initializeSystems(): void {
		this.initializeMoraleDisplay();
	}


	registerEventHandlers(): void {

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

			// Clean up MoraleDisplay resources (includes shield display now)
			MoraleDisplay.destroy();

			// Additional cleanup logic can be added here if needed
		} catch (error) {
			console.error("Error during BattlegroundEventSystem destruction:", error);
		}
	}
}