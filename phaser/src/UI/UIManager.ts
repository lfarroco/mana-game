import Phaser from "phaser";
import * as constants from "../constants/constants";
import { BattlegroundScene } from "../Scenes/Battleground/BattlegroundScene";
import { tween } from "../Utils/animation";
import { COLOR_BLACK } from "../Utils/colors";
import { Tooltip } from "./Tooltip";
import { GoldCoinAnimator } from "./GoldCoinAnimator";
import { GameEvents } from "../constants/events";
import { UserMessagePayload } from "../Models/EventPayloads";

/**
 * Manages the user interface elements within the BattlegroundScene.
 * This class is responsible for creating, updating, and destroying UI components
 * such as buttons, text displays (like gold), and informational pop-ups (like errors or tooltips).
 * It also handles UI-related animations and responses to game state changes (e.g., gold updates).
 */
export class UIManager {
	private scene: BattlegroundScene;
	/** Container for main persistent UI elements like sidebar and gold display. */
	private uiContainer: Phaser.GameObjects.Container | null = null;
	/** Phaser text element for displaying player's gold. */
	private goldTextElement: Phaser.GameObjects.Text | null = null;
	/** Phaser text element for displaying player's prestige. */
	private prestigeTextElement: Phaser.GameObjects.Text | null = null;
	/** Instance of GoldCoinAnimator for handling gold coin animations. */
	private goldCoinAnimator: GoldCoinAnimator;


	/**
	 * Instance of the Tooltip system, used to display contextual information
	 * when hovering over UI elements or game objects.
	 */
	public tooltip: Tooltip;

	/**
	 * Initializes the UIManager.
	 * @param scene The `BattlegroundScene` instance this UIManager will be associated with.
	 *              This provides context for adding UI elements and accessing scene-specific systems.
	 * It sets up listeners for game events that affect the UI, such as changes in player gold.
	 */
	constructor(scene: BattlegroundScene) {
		this.scene = scene;
		this.goldCoinAnimator = new GoldCoinAnimator(this.scene);
		this._setupGoldChangeListener();
		this._setupPrestigeChangeListener(); // Add listener for prestige
		this._setupPurchaseFailedListener();
		this._setupUserMessageListener();
		this.tooltip = new Tooltip(scene);
		this._setupTooltipShowListener();
		this._setupTooltipHideListener();
	}

	/**
	 * Sets up an event listener for "prestige_changed" events.
	 * This allows the UIManager to react to updates in the player's prestige.
	 */
	private _setupPrestigeChangeListener(): void {
		this.scene.events.on(GameEvents.PRESTIGE_CHANGED, this._handlePrestigeChanged, this);
	}

	/**
	 * Sets up an event listener for "gold_changed" events emitted by the scene.
	 * This allows the UIManager to react dynamically to updates in the player's gold
	 * by calling `_handleGoldChanged`.
	 */
	private _setupGoldChangeListener(): void {
		this.scene.events.on(GameEvents.GOLD_CHANGED, this._handleGoldChanged, this);
	}

	/**
	 * Sets up an event listener for "purchase_failed" events.
	 * This allows the UIManager to display appropriate user messages when a purchase cannot be completed.
	 */
	private _setupPurchaseFailedListener(): void {
		this.scene.events.on(GameEvents.PURCHASE_FAILED, this._handlePurchaseFailed, this);
	}

	/**
	 * Sets up an event listener for "user_message_requested" events.
	 * This allows other game systems to request the display of messages (errors, info, etc.) to the user.
	 */
	private _setupUserMessageListener(): void {
		this.scene.events.on(GameEvents.USER_MESSAGE_REQUESTED, this._handleUserMessageRequested, this);
	}

	/**
	 * Sets up an event listener for "tooltip_show" events.
	 * This allows other game systems to request the display of a tooltip.
	 */
	private _setupTooltipShowListener(): void {
		this.scene.events.on(GameEvents.TOOLTIP_SHOW, (payload: { x: number, y: number, title: string, description: string }) => {
			this.tooltip.render(payload.x, payload.y, payload.title, payload.description);
		}, this);
	}

	/**
	 * Sets up an event listener for "tooltip_hide" events.
	 * This allows other game systems to request hiding the tooltip.
	 */
	private _setupTooltipHideListener(): void {
		this.scene.events.on(GameEvents.TOOLTIP_HIDE, () => this.tooltip.hide(), this);
	}

	/**
	 * Handles the `GameEvents.PURCHASE_FAILED` event by constructing and emitting a user message.
	 * @param payload - The payload containing details about the failed purchase, including the unit name, reason, and optionally the cost.
	 */
	private _handlePurchaseFailed(payload: { unitName: string, reason: string, cost?: number }): void {
		let message = `Could not buy ${payload.unitName}. `;
		switch (payload.reason) {
			case "PARTY_FULL":
				message += "Your party is full!";
				break;
			case "INSUFFICIENT_GOLD":
				message += `Not enough gold! (Cost: ${payload.cost ?? 'N/A'})`;
				break;
			case "SLOT_OCCUPIED":
				message += "That slot is already occupied.";
				break;
			default: message += "Reason unknown.";
		}
		this.scene.events.emit(GameEvents.USER_MESSAGE_REQUESTED, {
			text: message,
			type: 'error'
		} as UserMessagePayload);
	}

	/**
	 * Handles the "gold_changed" event.
	 * It updates the displayed gold amount and triggers a visual animation if the gold amount has changed.
	 * @param newTotalGold - The new total amount of gold the player has.
	 * @param goldDelta The amount of gold that was gained or lost.
	 */
	private _handleGoldChanged(newTotalGold: number, goldDelta: number): void {
		if (this.goldTextElement) {
			this.goldTextElement.setText("Gold: " + newTotalGold);
			if (goldDelta !== 0) { // Play animation only if there's a change
				this.goldChangeAnimation(goldDelta);
			}
		}
		// If goldTextElement is null, the text will be set when _createGoldText is called.
		// The animation for this specific change is skipped.
	}

	/**
	 * Handles the "prestige_changed" event.
	 * It updates the displayed prestige amount.
	 * @param newTotalPrestige - The new total amount of prestige the player has.
	 * @param _prestigeDelta - The amount of prestige that was gained or lost (can be used for animations later).
	 */
	private _handlePrestigeChanged(newTotalPrestige: number, _prestigeDelta: number): void {
		if (this.prestigeTextElement) {
			this.prestigeTextElement.setText("Prestige: " + newTotalPrestige);
		}
	}

	/**
	 * Creates and displays the main persistent UI elements of the game,
	 * such as a sidebar and the player's gold display.
	 */
	public createMainUI(): void {
		this.destroyMainUI(); // Clean up previous UI if any

		this.uiContainer = this.scene.add.container(0, 0);

		const sidebarWidth = constants.TILE_WIDTH;
		const sidebarBg = this.scene.add.graphics();
		sidebarBg.fillStyle(COLOR_BLACK, 0.7);
		sidebarBg.fillRect(
			(this.scene.cameras.main.width - sidebarWidth),
			0, sidebarWidth, this.scene.cameras.main.height
		);
		this.uiContainer.add(sidebarBg);

		this._createGoldText(this.uiContainer);
		this._createPrestigeText(this.uiContainer); // Create prestige display
	}

	/**
	 * Creates the text element that displays the player's current gold.
	 * This method is typically called by `createMainUI` to initialize the gold display.
	 * It positions the text based on screen constants and sets its initial value from the game state.
	 * @param parent The `Phaser.GameObjects.Container` to which the gold text will be added.
	 */
	private _createGoldText(parent: Phaser.GameObjects.Container): void {

		const initialGold = this.scene.state.gameData.player.gold;
		this.goldTextElement = this.scene.add.text(
			constants.SCREEN_WIDTH - 120,
			constants.SCREEN_HEIGHT - 100,
			"Gold: " + initialGold, constants.defaultTextConfig
		);
		parent.add(this.goldTextElement);
	}

	/**
	 * Creates the text element that displays the player's current prestige.
	 * @param parent The `Phaser.GameObjects.Container` to which the prestige text will be added.
	 */
	private _createPrestigeText(parent: Phaser.GameObjects.Container): void {
		const initialPrestige = this.scene.state.gameData.player.prestige;
		this.prestigeTextElement = this.scene.add.text(
			constants.SCREEN_WIDTH - 120, // Same X as gold text
			constants.SCREEN_HEIGHT - 100 + 30, // Positioned below gold text
			"Prestige: " + initialPrestige,
			constants.defaultTextConfig
		);
		parent.add(this.prestigeTextElement);
	}



	/**
	 * Handles requests to display a user message (e.g., error, info).
	 * The message appears, animates briefly for emphasis, and then fades out.
	 * This method is asynchronous and completes when the message animation finishes.
	 * @param payload The `UserMessagePayload` containing the message text and type.
	 */
	private async _handleUserMessageRequested(payload: UserMessagePayload): Promise<void> {

		// Determine text style based on payload.type if needed, for now, all use titleTextConfig
		const textStyle = constants.titleTextConfig;

		const text = this.scene.add.text(
			constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT - 100,
			payload.text,
			textStyle,
		).setOrigin(0.5);

		await tween({
			targets: [text],
			scaleX: 1.05,
			scaleY: 1.05,
			duration: 1000,
			yoyo: true,
			ease: "Sine.elastic", // Phaser.Math.Easing.Sine.Elastic if using Phaser's easing
			repeat: 0,
		});

		await tween({
			targets: [text],
			alpha: 0,
		});

		text.destroy();
	}

	/**
	 * Destroys the main UI container and its children.
	 * This is used to clean up the UI, for example, when transitioning between scenes or game states.
	 */
	public destroyMainUI(): void {
		if (this.uiContainer) {
			this.uiContainer.destroy(true); // true to destroy children
			this.uiContainer = null;
		}
		this.goldTextElement = null; // Was a child of uiContainer
		this.prestigeTextElement = null; // Was a child of uiContainer
	}

	/**
	 * Performs a full cleanup of the UIManager.
	 * This includes destroying the main UI and removing any event listeners
	 * to prevent memory leaks. Should be called when the UIManager is no longer needed.
	 */
	public destroy(): void { // Full cleanup for the UIManager
		this.destroyMainUI();
		this.scene.events.off(GameEvents.GOLD_CHANGED, this._handleGoldChanged, this);
		this.scene.events.off(GameEvents.PRESTIGE_CHANGED, this._handlePrestigeChanged, this);
		this.scene.events.off(GameEvents.PURCHASE_FAILED, this._handlePurchaseFailed, this);
		this.scene.events.off(GameEvents.USER_MESSAGE_REQUESTED, this._handleUserMessageRequested, this);
		this.scene.events.off(GameEvents.TOOLTIP_SHOW);
		this.scene.events.off(GameEvents.TOOLTIP_HIDE);
	}

	/**
	 * Plays an animation indicating a change in the player's gold.
	 * A text element showing the amount of gold gained or lost animates near the gold display.
	 * This method is asynchronous and completes when the animation finishes.
	 * @param gold - The amount of gold that changed (positive for gain, negative for loss).
	 */
	public async goldChangeAnimation(gold: number): Promise<void> {
		// This method is now only called if this.goldTextElement is not null (see _handleGoldChanged).
		const sign = gold > 0 ? "+" : "";
		const animationText = `${sign}${gold}`;

		const startX = this.goldTextElement!.x + this.goldTextElement!.width / 2;
		const startY = this.goldTextElement!.y + this.goldTextElement!.height / 2;

		const goldAmountText = this.scene.add.text(
			startX,
			startY,
			animationText, constants.titleTextConfig)
			.setOrigin(0.5, 0.5)
			.setAlpha(0)
			.setScale(1);

		await tween({
			targets: [goldAmountText],
			alpha: 1,
			scale: 1.2, // Was: this.goldTextElement ? 1.2 : 1.5
			y: startY - 30, // Move upwards from the goldText position
		});

		await tween({
			targets: [goldAmountText],
			alpha: 0,
			scale: 1,
			y: startY - 60, // Continue moving upwards
			duration: 800,
		});

		goldAmountText.destroy();
	}

	/**
	 * Simulates coins dropping and flying towards the gold display area.
	 * This provides a more visual and engaging way to show gold being acquired.
	 * It internally calls `goldChangeAnimation` for the text update and uses `GoldCoinAnimator`
	 * for the coin sprite animations. This method is asynchronous.
	 * @param gold - The total amount of gold being added (used for the `goldChangeAnimation`).
	 * @param coins - The number of visual coin sprites to animate.
	 * @param x - The starting x-coordinate for the coin animation (e.g., where an enemy was defeated).
	 * @param y - The starting y-coordinate for the coin animation.
	 */
	public async coinDropIO(
		gold: number,
		coins: number,
		x: number, y: number,
	): Promise<void> {
		this.goldChangeAnimation(gold); // UI feedback
		if (!this.goldCoinAnimator) {
			console.error("UIManager: GoldCoinAnimator not initialized. Cannot play coin drop animation.");
			return;
		}
		await this.goldCoinAnimator.animateCoinDrop(coins, x, y);
	}
}