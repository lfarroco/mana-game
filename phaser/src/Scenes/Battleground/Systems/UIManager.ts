import Phaser from "phaser";
import * as constants from "../constants";
import { BattlegroundScene } from "../BattlegroundScene";
import { tween } from "../../../Utils/animation";
import { COLOR_BLACK } from "../../../Utils/colors";
import { playerForce } from "../../../Models/Force";
import { Tooltip } from "../../../Systems/Tooltip";
import { GoldCoinAnimator } from "./GoldCoinAnimator";
import { GameEvents } from "../../../constants/events";

/**
 * Manages the user interface elements within the BattlegroundScene.
 * This class is responsible for creating, updating, and destroying UI components
 * such as buttons, text displays (like gold), and informational pop-ups (like errors or tooltips).
 * It also handles UI-related animations and responses to game state changes (e.g., gold updates).
 */
export class UIManager {
	private scene: BattlegroundScene;

	private uiContainer: Phaser.GameObjects.Container | null = null;
	private goldTextElement: Phaser.GameObjects.Text | null = null;
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
		this._setupGoldChangeListener();
		this.tooltip = new Tooltip(scene)
	}

	/**
	 * Sets up an event listener for "gold_changed" events emitted by the scene.
	 * This allows the UIManager to react dynamically to updates in the player's gold.
	 */
	private _setupGoldChangeListener(): void {
		this.scene.events.on(GameEvents.GOLD_CHANGED, this._handleGoldChanged, this);
	}

	/**
	 * Handles the "gold_changed" event.
	 * @param newTotalGold The new total amount of gold the player has.
	 * @param goldDelta The amount of gold that was gained or lost.
	 */
	private _handleGoldChanged(newTotalGold: number, goldDelta: number): void {
		if (this.goldTextElement) {
			this.goldTextElement.setText("Gold: " + newTotalGold);
		}
		if (goldDelta !== 0) { // Play animation only if there's a change
			this.goldChangeAnimation(goldDelta);
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
	}

	/**
	 * Creates the text element that displays the player's current gold.
	 * This is a helper method typically called by `createMainUI`.
	 * @param parent The `Phaser.GameObjects.Container` to which the gold text will be added.
	 */
	private _createGoldText(parent: Phaser.GameObjects.Container): void {
		// Assuming playerForce is the correct way to get player's gold initially
		const initialGold = playerForce.gold; // Or getState().gameData.player.gold;
		this.goldTextElement = this.scene.add.text(
			constants.SCREEN_WIDTH - 120,
			constants.SCREEN_HEIGHT - 100,
			"Gold: " + initialGold, constants.defaultTextConfig
		);
		parent.add(this.goldTextElement);
	}

	/**
	 * Displays a temporary error message to the player.
	 * The message appears, animates briefly for emphasis, and then fades out.
	 * This is used to provide feedback for invalid actions or system errors.
	 * @param errorMessage The error message string to display.
	 */
	public async displayError(errorMessage: string): Promise<void> {
		// this.scene.sound.play('ui/error'); // If you have an error sound

		const text = this.scene.add.text(
			constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT - 100,
			errorMessage,
			constants.titleTextConfig,
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
	}

	/**
	 * Performs a full cleanup of the UIManager.
	 * This includes destroying the main UI and removing any event listeners
	 * to prevent memory leaks. Should be called when the UIManager is no longer needed.
	 */
	public destroy(): void { // Full cleanup for the UIManager
		this.destroyMainUI();
		this.scene.events.off(GameEvents.GOLD_CHANGED, this._handleGoldChanged, this);
	}

	/**
	 * Plays an animation indicating a change in the player's gold.
	 * A text element showing the amount of gold gained or lost animates near the gold display.
	 * @param gold The amount of gold that changed (positive for gain, negative for loss).
	 */
	public async goldChangeAnimation(gold: number): Promise<void> {
		const sign = gold > 0 ? "+" : "";
		const animationText = `${sign}${gold}`;

		const startX = this.goldTextElement ? this.goldTextElement.x + this.goldTextElement.width / 2 : constants.SCREEN_WIDTH - 100;
		const startY = this.goldTextElement ? this.goldTextElement.y + this.goldTextElement.height / 2 : constants.SCREEN_HEIGHT - 150; // Adjusted default Y

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
			scale: this.goldTextElement ? 1.2 : 1.5,
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
	 * @param gold The total amount of gold being added (used for the `goldChangeAnimation`).
	 * @param coins The number of visual coin sprites to animate.
	 * @param x The starting x-coordinate for the coin animation (e.g., where an enemy was defeated).
	 * @param y The starting y-coordinate for the coin animation.
	 */
	public async coinDropIO(
		gold: number,
		coins: number,
		x: number, y: number,
	): Promise<void> {
		this.goldChangeAnimation(gold); // UI feedback
		await this.goldCoinAnimator.animateCoinDrop(coins, x, y);
	}
}