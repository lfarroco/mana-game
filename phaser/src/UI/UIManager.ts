import Phaser from "phaser";
import * as constants from "../constants/constants";
import { BattlegroundScene } from "../Scenes/Battleground/BattlegroundScene";
import { tween } from "../Utils/animation";
import * as Tooltip from "./Tooltip";
import { GoldCoinAnimator } from "./GoldCoinAnimator";
import { GameEvents } from "../constants/events";
import { DifficultyTier } from "../Scenes/Battleground/generateEnemyTeam";
import { UserMessagePayload } from "../Models/EventPayloads";

const SIDEBAR_TEXT_BASE_X = 300;
const SIDEBAR_TEXT_BASE_Y = -400;
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
	/** Phaser text element for displaying player's gold. */
	goldTextElement: Phaser.GameObjects.Text | null = null;
	/** Phaser text element for displaying player's prestige. */
	prestigeTextElement: Phaser.GameObjects.Text | null = null;
	/** Instance of GoldCoinAnimator for handling gold coin animations. */
	goldCoinAnimator: GoldCoinAnimator;
	/** Phaser text element for displaying player's win streak. */
	winStreakTextElement: Phaser.GameObjects.Text | null = null;
	/** Phaser text element for displaying player's loss streak. */
	lossStreakTextElement: Phaser.GameObjects.Text | null = null;
	/** Phaser text element for displaying total rounds played. */
	totalRoundsTextElement: Phaser.GameObjects.Text | null = null;
	/** Phaser text element for displaying the current difficulty tier. */
	difficultyTierTextElement: Phaser.GameObjects.Text | null = null;


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
		this._setupPrestigeChangeListener();
		this._setupRoundStatsListener();
		this._setupPurchaseFailedListener();
		this._setupUserMessageListener();
		this._setupDifficultyTierChangeListener();
		Tooltip.initializeTooltip(scene);
		this._setupTooltipShowListener();
		this._setupTooltipHideListener();
	}

	/**
	 * Sets up an event listener for "prestige_changed" events.
	 * This allows the UIManager to react to updates in the player's prestige.
	 */
	_setupPrestigeChangeListener(): void {
		this.scene.events.on(GameEvents.PRESTIGE_CHANGED, this._handlePrestigeChanged, this);
	}

	/**
	 * Sets up an event listener for "round_ended_update_stats" events.
	 * This allows the UIManager to react to updates in round-end stats.
	 */
	_setupRoundStatsListener(): void {
		this.scene.events.on(GameEvents.ROUND_ENDED_UPDATE_STATS, this._handleRoundStatsUpdate, this);
	}

	/**
	 * Sets up an event listener for "gold_changed" events emitted by the scene.
	 * This allows the UIManager to react dynamically to updates in the player's gold
	 * by calling `_handleGoldChanged`.
	 */
	_setupGoldChangeListener(): void {
		this.scene.events.on(GameEvents.GOLD_CHANGED, this._handleGoldChanged, this);
	}

	/**
	 * Sets up an event listener for "purchase_failed" events.
	 * This allows the UIManager to display appropriate user messages when a purchase cannot be completed.
	 */
	_setupPurchaseFailedListener(): void {
		this.scene.events.on(GameEvents.PURCHASE_FAILED, this._handlePurchaseFailed, this);
	}

	/**
	 * Sets up an event listener for "user_message_requested" events.
	 * This allows other game systems to request the display of messages (errors, info, etc.) to the user.
	 */
	_setupUserMessageListener(): void {
		this.scene.events.on(GameEvents.USER_MESSAGE_REQUESTED, this._handleUserMessageRequested, this);
	}

	/**
	 * Sets up an event listener for "tooltip_show" events.
	 * This allows other game systems to request the display of a tooltip.
	 */
	_setupTooltipShowListener(): void {
		this.scene.events.on(GameEvents.TOOLTIP_SHOW, (payload: { x: number, y: number, title: string, description: string }) => {
			Tooltip.renderTooltip(payload.x, payload.y, payload.title, payload.description);
		}, this);
	}

	/**
	 * Sets up an event listener for "tooltip_hide" events.
	 * This allows other game systems to request hiding the tooltip.
	 */
	_setupTooltipHideListener(): void {
		this.scene.events.on(GameEvents.TOOLTIP_HIDE, () => Tooltip.hideTooltip(), this);
	}

	/**
	 * Sets up an event listener for "difficulty_tier_changed" events.
	 * This allows the UIManager to react to updates in the current difficulty tier.
	 */
	_setupDifficultyTierChangeListener(): void {
		this.scene.events.on(GameEvents.DIFFICULTY_TIER_CHANGED, this._handleDifficultyTierChanged, this);
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
	_handleGoldChanged(newTotalGold: number, goldDelta: number): void {
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
	 * Handles the "round_ended_update_stats" event.
	 * It updates the displayed total rounds, win streak, and loss streak.
	 * @param payload - The payload containing total rounds and current prestige.
	 */
	_handleRoundStatsUpdate(payload: { totalRounds: number, currentPrestige: number }): void {
		if (this.totalRoundsTextElement) this.totalRoundsTextElement.setText(`Rounds: ${payload.totalRounds}`);
		if (this.winStreakTextElement) this.winStreakTextElement.setText(`Win Streak: ${this.scene.state.gameData.player.winStreak}`);
		if (this.lossStreakTextElement) this.lossStreakTextElement.setText(`Loss Streak: ${this.scene.state.gameData.player.lossStreak}`);
	}

	/**
	 * Handles the "prestige_changed" event.
	 * It updates the displayed prestige amount.
	 * @param newTotalPrestige - The new total amount of prestige the player has.
	 * @param _prestigeDelta - The amount of prestige that was gained or lost (can be used for animations later).
	 */
	_handlePrestigeChanged(newTotalPrestige: number, _prestigeDelta: number): void {
		if (this.prestigeTextElement) {
			this.prestigeTextElement.setText("Prestige: " + newTotalPrestige);
		}
	}

	/**
	 * Handles the "difficulty_tier_changed" event.
	 * It updates the displayed difficulty tier.
	 * @param payload - The payload containing the new difficulty tier.
	 */
	_handleDifficultyTierChanged(payload: { difficultyTier: DifficultyTier }): void {
		if (this.difficultyTierTextElement) {
			this.difficultyTierTextElement.setText(`Tier: ${payload.difficultyTier}`);
		}
	}

	/**
	 * Creates and displays the main persistent UI elements of the game,
	 * such as a sidebar and the player's gold display.
	 */
	createMainUI(): void {
		this.destroyMainUI(); // Clean up previous UI if any

		this.uiContainer = this.scene.add.container(0, 0);

		this._createGoldText(this.uiContainer);
		this._createPrestigeText(this.uiContainer);
		this._createTotalRoundsText(this.uiContainer);
		this._createWinStreakText(this.uiContainer);
		this._createLossStreakText(this.uiContainer);
		this._createDifficultyTierText(this.uiContainer);

	}

	/**
	 * Creates the text element that displays the player's current gold.
	 * This method is typically called by `createMainUI` to initialize the gold display.
	 * It positions the text based on screen constants and sets its initial value from the game state.
	 * @param parent The `Phaser.GameObjects.Container` to which the gold text will be added.
	 */
	_createGoldText(parent: Phaser.GameObjects.Container): void {

		const initialGold = this.scene.state.gameData.player.gold;
		this.goldTextElement = this.scene.add.text(
			constants.SCREEN_WIDTH - SIDEBAR_TEXT_BASE_X,
			constants.SCREEN_HEIGHT + SIDEBAR_TEXT_BASE_Y,
			`Gold: ${initialGold}`,
			constants.titleTextConfig
		);
		parent.add(this.goldTextElement);
	}

	/**
	 * Creates the text element that displays the player's current prestige.
	 * @param parent The `Phaser.GameObjects.Container` to which the prestige text will be added.
	 */
	_createPrestigeText(parent: Phaser.GameObjects.Container): void {
		const initialPrestige = this.scene.state.gameData.player.prestige;
		this.prestigeTextElement = this.scene.add.text(
			constants.SCREEN_WIDTH - SIDEBAR_TEXT_BASE_X,
			constants.SCREEN_HEIGHT + SIDEBAR_TEXT_BASE_Y + 50,
			`Prestige: ${initialPrestige}`,
			constants.titleTextConfig
		);
		parent.add(this.prestigeTextElement);
	}

	/**
	 * Creates the text element that displays the total rounds played.
	 * @param parent The `Phaser.GameObjects.Container` to which the text will be added.
	 */
	_createTotalRoundsText(parent: Phaser.GameObjects.Container): void {
		const initialRounds = this.scene.state.gameData.player.totalRoundsPlayed;
		this.totalRoundsTextElement = this.scene.add.text(
			constants.SCREEN_WIDTH - SIDEBAR_TEXT_BASE_X,
			constants.SCREEN_HEIGHT + SIDEBAR_TEXT_BASE_Y + 100,
			`Rounds: ${initialRounds}`,
			constants.titleTextConfig
		);
		parent.add(this.totalRoundsTextElement);
	}

	/**
	 * Creates the text element that displays the player's current win streak.
	 * @param parent The `Phaser.GameObjects.Container` to which the text will be added.
	 */
	_createWinStreakText(parent: Phaser.GameObjects.Container): void {
		const initialStreak = this.scene.state.gameData.player.winStreak;
		this.winStreakTextElement = this.scene.add.text(
			constants.SCREEN_WIDTH - SIDEBAR_TEXT_BASE_X,
			constants.SCREEN_HEIGHT + SIDEBAR_TEXT_BASE_Y + 150,
			`Win Streak: ${initialStreak}`,
			constants.titleTextConfig
		);
		parent.add(this.winStreakTextElement);
	}

	/**
	 * Creates the text element that displays the player's current loss streak.
	 * @param parent The `Phaser.GameObjects.Container` to which the text will be added.
	 */
	_createLossStreakText(parent: Phaser.GameObjects.Container): void {
		const initialStreak = this.scene.state.gameData.player.lossStreak;
		this.lossStreakTextElement = this.scene.add.text(
			constants.SCREEN_WIDTH - SIDEBAR_TEXT_BASE_X,
			constants.SCREEN_HEIGHT + SIDEBAR_TEXT_BASE_Y + 200,
			`Loss Streak: ${initialStreak}`,
			constants.titleTextConfig
		);
		parent.add(this.lossStreakTextElement);
	}

	/**
	 * Creates the text element that displays the current difficulty tier.
	 * @param parent The `Phaser.GameObjects.Container` to which the text will be added.
	 */
	_createDifficultyTierText(parent: Phaser.GameObjects.Container): void {
		// Initial text based on player prestige, will be updated by event
		const initialTier = this.scene.state.gameData.player.prestige < 10 ? "Challenger" : (this.scene.state.gameData.player.prestige < 20 ? "Veteran" : "Elite");
		this.difficultyTierTextElement = this.scene.add.text(
			constants.SCREEN_WIDTH - SIDEBAR_TEXT_BASE_X,
			constants.SCREEN_HEIGHT + SIDEBAR_TEXT_BASE_Y + 250,
			`Tier: ${initialTier}`,
			constants.titleTextConfig
		);
		parent.add(this.difficultyTierTextElement);
	}

	/**
	 * Handles requests to display a user message (e.g., error, info).
	 * The message appears, animates briefly for emphasis, and then fades out.
	 * This method is asynchronous and completes when the message animation finishes.
	 * @param payload The `UserMessagePayload` containing the message text and type.
	 */
	async _handleUserMessageRequested(payload: UserMessagePayload): Promise<void> {

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
	destroyMainUI(): void {
		if (this.uiContainer) {
			this.uiContainer.destroy(true); // true to destroy children
			this.uiContainer = null;
		}
		// These elements were chiildren of uiContainer
		this.goldTextElement = null;
		this.prestigeTextElement = null;
		this.totalRoundsTextElement = null;
		this.winStreakTextElement = null;
		this.lossStreakTextElement = null;
		this.difficultyTierTextElement = null;

	}

	/**
	 * Performs a full cleanup of the UIManager.
	 * This includes destroying the main UI and removing any event listeners
	 * to prevent memory leaks. Should be called when the UIManager is no longer needed.
	 */
	destroy(): void { // Full cleanup for the UIManager
		this.destroyMainUI();
		Tooltip.destroyTooltip();
		this.scene.events.off(GameEvents.GOLD_CHANGED, this._handleGoldChanged, this);
		this.scene.events.off(GameEvents.PRESTIGE_CHANGED, this._handlePrestigeChanged, this);
		this.scene.events.off(GameEvents.PURCHASE_FAILED, this._handlePurchaseFailed, this);
		this.scene.events.off(GameEvents.USER_MESSAGE_REQUESTED, this._handleUserMessageRequested, this);
		this.scene.events.off(GameEvents.TOOLTIP_SHOW);
		this.scene.events.off(GameEvents.TOOLTIP_HIDE);
		this.scene.events.off(GameEvents.DIFFICULTY_TIER_CHANGED, this._handleDifficultyTierChanged, this);
		this.scene.events.off(GameEvents.ROUND_ENDED_UPDATE_STATS, this._handleRoundStatsUpdate, this);

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