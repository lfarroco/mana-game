import Phaser from "phaser";
import * as c from "../constants/constants";
import { BattlegroundScene } from "../Scenes/Battleground/BattlegroundScene";
import { tween } from "../Utils/animation";
import * as Tooltip from "./Tooltip";
import { GoldCoinAnimator } from "./GoldCoinAnimator";
import { GameEvents } from "../constants/events";
import { UserMessagePayload } from "../Models/EventPayloads";
import { TypedEventEmitter } from "../Systems/Events/TypedEventEmitter";
import { GoldSystemEventPayloads, GoldSystemEvents } from "../Systems/GoldSystem/events";

export let ui: UIManager;

/**
 * Manages the user interface elements within the BattlegroundScene.
 * This class is responsible for creating, updating, and destroying UI components
 * such as buttons, text displays (like gold), and informational pop-ups (like errors or tooltips).
 * It also handles UI-related animations and responses to game state changes (e.g., gold updates).
 */
export class UIManager {
	scene: BattlegroundScene;
	/** Container for main persistent UI elements like sidebar and gold display. */
	uiContainer: Phaser.GameObjects.Container | null = null;
	/** Container for the gold display UI. */
	goldContainer: Phaser.GameObjects.Container | null = null;
	/** Phaser text element for displaying player's gold. */
	goldTextElement: Phaser.GameObjects.Text | null = null;
	/** Phaser text element for displaying player's prestige. */
	prestigeTextElement: Phaser.GameObjects.Text | null = null;
	/** Instance of GoldCoinAnimator for handling gold coin animations. */
	goldCoinAnimator: GoldCoinAnimator;
	/** Typed event emitter for gold system events. */
	private goldEvents: TypedEventEmitter<GoldSystemEventPayloads>;

	/**
	 * Initializes the UIManager.
	 * @param scene The `BattlegroundScene` instance this UIManager will be associated with.
	 *              This provides context for adding UI elements and accessing scene-specific systems.
	 * It sets up listeners for game events that affect the UI, such as changes in player gold.
	 */
	constructor(scene: BattlegroundScene) {
		this.scene = scene;
		this.goldCoinAnimator = new GoldCoinAnimator(this.scene);
		this.goldEvents = new TypedEventEmitter<GoldSystemEventPayloads>(this.scene.events);
		this._setupPurchaseFailedListener();
		Tooltip.initializeTooltip(scene);
		ui = this;
	}



	/**
	 * Sets up an event listener for "purchase_failed" events.
	 * This allows the UIManager to display appropriate user messages when a purchase cannot be completed.
	 */
	_setupPurchaseFailedListener(): void {
		this.scene.events.on(GameEvents.PURCHASE_FAILED, this._handlePurchaseFailed, this);
	}

	/**
	 * Handles the `GameEvents.PURCHASE_FAILED` event by constructing and emitting a user message.
	 * @param payload - The payload containing details about the failed purchase, including the unit name, reason, and optionally the cost.
	 */
	_handlePurchaseFailed(payload: { unitName: string, reason: string, cost?: number }): void {
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
		this._handleUserMessageRequested({ text: message, type: 'error' });

	}

	/**
	 * Handles the "gold_changed" event.
	 * It updates the displayed gold amount and triggers a visual animation if the gold amount has changed.
	 * @param newTotalGold - The new total amount of gold the player has.
	 * @param goldDelta The amount of gold that was gained or lost.
	 */
	handleGoldChanged(newTotalGold: number, goldDelta: number): void {
		if (this.goldTextElement) {
			this.goldTextElement.setText(`${newTotalGold}`);
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
	updatePrestige(newTotalPrestige: number, _prestigeDelta: number): void {
		if (this.prestigeTextElement) {
			this.prestigeTextElement.setText(`${newTotalPrestige}`);
		}
		// Also update the prestige number in the gold display container if it exists
		// (already handled by prestigeTextElement, which is the one in the gold display)
	}



	/**
	 * Updates a morale text element with a new value and plays a wiggle animation.
	 * If an animation is already playing on the element, it's stopped and reset before the new one starts.
	 * @param textElement The Phaser.GameObjects.Text element to update.
	 * @param newMorale The new morale value.
	 */
	_updateMoraleTextWithAnimation(textElement: Phaser.GameObjects.Text, newMorale: number): void {
		// Stop any currently running tweens on this text element to prevent conflicts.
		this.scene.tweens.killTweensOf(textElement);

		// Reset to base state before starting the new animation.
		textElement.setRotation(0);

		// Update the text content.
		textElement.setText(`${Math.floor(newMorale)}`);

		// Create and play the wiggle animation timeline using the 'tweens' array pattern.
		const timeline = this.scene.add.timeline([{
			at: 0,
			tween: {
				targets: textElement,
				rotation: 0.08, // A small positive rotation
				duration: 80,
				ease: 'Power1'
			}
		}, {
			at: 80,
			tween: {
				targets: textElement,
				rotation: -0.08, // A small negative rotation
				duration: 160,
				ease: 'Power1'
			}
		}, {
			at: 160,
			tween: {
				targets: textElement,
				rotation: 0, // Return to base rotation
				duration: 80,
				ease: 'Power1'
			}
		}]);
		timeline.play();
	}

	/**
	 * Creates and displays the main persistent UI elements of the game,
	 * such as a sidebar and the player's gold display.
	 */
	createMainUI(): void {
		this.destroyMainUI(); // Clean up previous UI if any

		this.uiContainer = this.scene.add.container(0, 0);

		this._createGoldText(this.uiContainer);

		// Ensure prestige text is updated to current value after recreation
		if (this.prestigeTextElement) {
			this.prestigeTextElement.setText(`${this.scene.state.gameData.player.prestige}`);
		}
	}

	/**
	 * Creates the gold display UI element with a coin icon and rounded background.
	 * This method is typically called by `createMainUI` to initialize the gold display.
	 * It positions the display in the upper right corner and sets its initial value from the game state.
	 * @param parent The `Phaser.GameObjects.Container` to which the gold display will be added.
	 */
	_createGoldText(parent: Phaser.GameObjects.Container): void {
		const initialGold = this.scene.state.gameData.player.gold;

		// Position in upper right corner
		const displayX = c.SCREEN_WIDTH - 120;
		const displayY = 30;

		// Create a container for the gold display
		this.goldContainer = this.scene.add.container(displayX, displayY);

		// Create rounded rectangle background
		const background = this.scene.add.graphics();
		background.fillStyle(0x2d3d1a, 0.8); // Darker green color with transparency
		background.lineStyle(3, 0x1a2610, 1); // Even darker border
		background.fillRoundedRect(-50, -20, 100, 40, 20);
		background.strokeRoundedRect(-50, -20, 100, 40, 20);
		this.goldContainer.add(background);

		// Create coin icon on the left
		const coinIcon = this.scene.add.image(-25, 0, 'coin').setScale(0.8);
		this.goldContainer.add(coinIcon);

		// Create text for the gold amount
		this.goldTextElement = this.scene.add.text(
			0, 0,
			`${initialGold}`,
			{
				...c.titleTextConfig,
				fontSize: '24px',
				color: '#ffffff'
			}
		).setOrigin(0, 0.5);
		this.goldContainer.add(this.goldTextElement);

		// Create prestige display styled like gold display, below goldTextElement
		const initialPrestige = this.scene.state.gameData.player.prestige;
		// Container for prestige display
		const prestigeContainer = this.scene.add.container(0, 44); // 44px below goldTextElement (was 28)

		// Rounded rectangle background for prestige
		const prestigeBg = this.scene.add.graphics();
		prestigeBg.fillStyle(0x3a2d1a, 0.8); // Brownish color with transparency
		prestigeBg.lineStyle(3, 0x261a10, 1); // Dark border
		prestigeBg.fillRoundedRect(-50, -20, 100, 40, 20);
		prestigeBg.strokeRoundedRect(-50, -20, 100, 40, 20);
		prestigeContainer.add(prestigeBg);

		// Icon for prestige (use coin image, but tint blue)
		const prestigeIcon = this.scene.add.image(-25, 0, 'coin').setScale(0.8);
		prestigeIcon.setTint(0x4a90ff); // Blue tint
		prestigeContainer.add(prestigeIcon);

		// Text for prestige amount
		this.prestigeTextElement = this.scene.add.text(
			0, 0,
			`${initialPrestige}`,
			{
				...c.titleTextConfig,
				fontSize: '24px', // Match gold text font size
				color: '#ffffff'   // Match gold text color
			}
		).setOrigin(0, 0.5);
		prestigeContainer.add(this.prestigeTextElement);

		this.goldContainer.add(prestigeContainer);

		parent.add(this.goldContainer);
	}

	/**
	 * Handles requests to display a user message (e.g., error, info).
	 * The message appears, animates briefly for emphasis, and then fades out.
	 * This method is asynchronous and completes when the message animation finishes.
	 * @param payload The `UserMessagePayload` containing the message text and type.
	 */
	async _handleUserMessageRequested(payload: UserMessagePayload): Promise<void> {

		// Determine text style based on payload.type if needed, for now, all use titleTextConfig
		const textStyle = c.titleTextConfig;

		const text = this.scene.add.text(
			c.SCREEN_WIDTH / 2, c.SCREEN_HEIGHT - 100,
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
	destroyMainUI(): void {
		if (this.uiContainer) {
			this.uiContainer.destroy(true); // true to destroy children
			this.uiContainer = null;
		}
		// These elements were children of uiContainer
		this.goldContainer = null;
		this.goldTextElement = null;
		this.prestigeTextElement = null;
	}

	/**
	 * Performs a full cleanup of the UIManager.
	 * This includes destroying the main UI and removing any event listeners
	 * to prevent memory leaks. Should be called when the UIManager is no longer needed.
	 */
	destroy(): void { // Full cleanup for the UIManager
		this.destroyMainUI();
		Tooltip.destroyTooltip();
		this.goldEvents.off(GoldSystemEvents.GOLD_CHANGED, this.handleGoldChanged.bind(this));
		this.scene.events.off(GameEvents.PURCHASE_FAILED, this._handlePurchaseFailed, this);
	}

	/**
	 * Plays an animation indicating a change in the player's gold.
	 * A text element showing the amount of gold gained or lost animates near the gold display.
	 * This method is asynchronous and completes when the animation finishes.
	 * @param gold - The amount of gold that changed (positive for gain, negative for loss).
	 */
	async goldChangeAnimation(gold: number): Promise<void> {
		// This method is now only called if this.goldTextElement is not null (see _handleGoldChanged).
		const sign = gold > 0 ? "+" : "";
		const animationText = `${sign}${gold}`;

		const startX = this.goldTextElement!.x + this.goldTextElement!.width / 2;
		const startY = this.goldTextElement!.y + this.goldTextElement!.height / 2;

		const goldAmountText = this.scene.add.text(
			startX,
			startY,
			animationText, c.titleTextConfig)
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
	async coinDropIO(
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