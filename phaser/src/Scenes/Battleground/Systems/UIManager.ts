import Phaser from "phaser";
import * as constants from "../constants";
import { BattlegroundScene } from "../BattlegroundScene";
import { delay, tween } from "../../../Utils/animation";
import { COLOR_BLACK } from "../../../Utils/colors";
import { State } from "../../../Models/State";
import { playerForce } from "../../../Models/Force";
import { Tooltip } from "../../../Systems/Tooltip";
/**
 * Manages the user interface elements within the BattlegroundScene.
 * This class is responsible for creating, updating, and destroying UI components
 * such as buttons, text displays (like gold), and informational pop-ups (like errors or tooltips).
 * It also handles UI-related animations and responses to game state changes (e.g., gold updates).
 */
export class UIManager {
	private scene: BattlegroundScene;
	private state: State;

	private uiContainer: Phaser.GameObjects.Container | null = null;
	private goldTextElement: Phaser.GameObjects.Text | null = null;
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
		this.state = scene.state; // Or use getState() if preferred globally
		this._setupGoldChangeListener();
		this.tooltip = new Tooltip(scene)
	}

	/**
	 * Sets up an event listener for "gold-changed" events emitted by the scene.
	 * This allows the UIManager to react dynamically to updates in the player's gold.
	 */
	private _setupGoldChangeListener(): void {
		this.scene.events.on("gold-changed", this._handleGoldChanged, this);
	}

	/**
	 * Handles the "gold-changed" event.
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
	 * Creates a standard interactive button with text.
	 * This method encapsulates the visual styling and event handling for buttons,
	 * ensuring a consistent look and feel across the UI.
	 * @param text The text to display on the button.
	 * @param x The x-coordinate for the center of the button.
	 * @param y The y-coordinate for the center of the button.
	 * @param callback The function to execute when the button is clicked.
	 * @returns A `Phaser.GameObjects.Container` عشقrepresenting the button,
	 *          which includes the button background and text label. This allows the button
	 *          to be treated as a single entity for positioning and management.
	 */
	public createButton(
		text: string,
		x: number,
		y: number,
		callback: () => void
	): Phaser.GameObjects.Container {
		// Define button appearance properties
		const buttonWidth = 180;
		const buttonHeight = 50;
		const cornerRadius = 10;

		const normalFillColor = 0x2c3e50; // Base dark slate blue
		const hoverFillColor = 0x34495e;  // Slightly lighter slate blue for hover
		const pressedFillColor = 0x273746; // Darker slate blue for pressed state

		const lineColor = 0x000000; // Black outline
		const lineWidth = 4;         // Thick outline

		// Create the graphics object for the button background
		const buttonGraphics = this.scene.add.graphics();

		// Helper function to draw the button state
		const drawButtonState = (fill: number) => {
			buttonGraphics.clear(); // Clear previous drawing
			buttonGraphics.fillStyle(fill, 1);
			buttonGraphics.fillRoundedRect(0, 0, buttonWidth, buttonHeight, cornerRadius);
			buttonGraphics.lineStyle(lineWidth, lineColor, 1);
			buttonGraphics.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, cornerRadius);
		};

		// Initial draw of the button in its normal state
		drawButtonState(normalFillColor);

		// Position the graphics object so its visual center is at (x, y)
		// The drawing within buttonGraphics is relative to (0,0) of the graphics object itself.
		buttonGraphics.setPosition(x - buttonWidth / 2, y - buttonHeight / 2);
		buttonGraphics.setName("buttonBackground"); // Name for later retrieval

		const buttonText = this.scene.add.text(
			x, y,
			text,
			{
				...constants.defaultTextConfig,
				color: '#ffffff', // White text
				stroke: 'none', // No stroke for the text itself
				strokeThickness: 0,
			}).setOrigin(0.5);
		buttonText.setName("buttonLabel"); // Name for later retrieval

		// Make the graphics object interactive
		// The hit area is relative to the graphics object's origin (top-left)
		const hitArea = new Phaser.Geom.Rectangle(0, 0, buttonWidth, buttonHeight);
		buttonGraphics.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

		let isPressed = false; // Flag to track if the button is currently pressed

		buttonGraphics.on(Phaser.Input.Events.POINTER_DOWN, () => {
			if (!buttonGraphics.input?.enabled) return;
			isPressed = true;
			drawButtonState(pressedFillColor);
			buttonText.setShadow(0, 0, "#eaeaea", 0, true, true);
		});

		buttonGraphics.on(Phaser.Input.Events.POINTER_UP, () => {
			if (!buttonGraphics.input?.enabled) return; // Should not happen if disabled, but good check

			const wasPressed = isPressed; // Capture the pressed state before resetting
			isPressed = false; // Reset pressed state immediately

			if (wasPressed) { // Only trigger callback and visual change if it was actually pressed
				// Determine final state based on pointer position
				// If POINTER_UP fires on buttonGraphics, the pointer is over it.
				// Set to hover state as the pointer is up and over the button.
				drawButtonState(hoverFillColor);
				buttonText.setShadow(2, 2, "#000000", 2, true, true); // Hover shadow
				callback();
			}
		});

		buttonGraphics.on(Phaser.Input.Events.POINTER_OVER, () => {
			if (!buttonGraphics.input?.enabled) return;
			if (isPressed) { // If dragged back over while still pressed
				drawButtonState(pressedFillColor);
			} else { // Normal hover, not pressed
				drawButtonState(hoverFillColor);
			}
			buttonText.setShadow(2, 2, "#000000", 2, true, true);
			tween({ targets: [buttonText], scale: 1.2 });
		});
		buttonGraphics.on(Phaser.Input.Events.POINTER_OUT, () => {
			if (!buttonGraphics.input?.enabled) return;
			// If pointer moves out, revert to normal color, regardless of pressed state (visual unpress)
			// The `isPressed` flag remains true if it was pressed, for POINTER_UP logic.
			drawButtonState(normalFillColor); // Revert to normal, even if pressed and dragged out.

			buttonText.setShadow(0, 0, "#000000", 0, true, true);
			tween({ targets: [buttonText], scale: 1.0 });
		});

		const container = this.scene.add.container(0, 0);
		container.add([buttonGraphics, buttonText]); // Add graphics first, then text
		return container;
	}

	/**
	 * Disables a button, making it visually appear inactive and non-interactive.
	 * This is useful for preventing actions when certain conditions are not met.
	 * @param button The button container (created by `createButton`) to disable.
	 */
	public disableButton(button: Phaser.GameObjects.Container): void {
		const buttonGraphics = button.getByName("buttonBackground") as Phaser.GameObjects.Graphics | null;
		const buttonText = button.getByName("buttonLabel") as Phaser.GameObjects.Text | null;

		if (buttonGraphics instanceof Phaser.GameObjects.Graphics) {
			buttonGraphics.setAlpha(0.5);
			buttonGraphics.disableInteractive();
		}
		if (buttonText instanceof Phaser.GameObjects.Text) { // Text might not be present in all generic containers
			buttonText.setAlpha(0.5);
		}
	}

	/**
	 * Enables a previously disabled button, restoring its interactive state and appearance.
	 * This allows the button to be used again.
	 * @param button The button container (created by `createButton`) to enable.
	 */
	public enableButton(button: Phaser.GameObjects.Container): void {
		const buttonGraphics = button.getByName("buttonBackground") as Phaser.GameObjects.Graphics | null;
		const buttonText = button.getByName("buttonLabel") as Phaser.GameObjects.Text | null;

		if (buttonGraphics instanceof Phaser.GameObjects.Graphics) {
			buttonGraphics.setAlpha(1);
			buttonGraphics.setInteractive(); // Re-enables with the previously set hit area
		}
		if (buttonText instanceof Phaser.GameObjects.Text) {
			buttonText.setAlpha(1);
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
		this.scene.events.off("gold-changed", this._handleGoldChanged, this);
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
		const currentSpeed = this.state.options.speed; // Use speed from UIManager's state

		const chestPosition: [number, number] = [
			this.scene.cameras.main.width - 150,
			this.scene.cameras.main.height - 100
		];
		const [chestX, chestY] = chestPosition;

		this.goldChangeAnimation(gold); // Call as a method

		for (let i = 0; i < coins; i++) {
			const coin = this.scene.add.image(0, 0, 'coin').setOrigin(0.5, 0.5)
				.setPosition(x + Math.random() * 200, y + Math.random() * 150)
				.setAlpha(0)
				.setRotation(Math.random() * Math.PI * 2);

			this.scene.tweens.add({
				targets: coin,
				alpha: 1,
				duration: (500 / currentSpeed) * Math.max(Math.random(), 0.5),
			});

			this.scene.tweens.add({
				targets: coin,
				scaleY: 0.5,
				duration: 100 / currentSpeed,
				yoyo: true,
				repeat: -1
			});

			this.scene.tweens.add({
				targets: coin,
				y: coin.y - 150,
				ease: "Quad.Out", // Phaser.Math.Easing.Quadratic.Out
				duration: 300 / currentSpeed,
				onComplete: () => {
					const distance = Phaser.Math.Distance.Between(coin.x, coin.y, chestX, chestY);
					this.scene.tweens.add({
						targets: coin,
						x: chestX,
						y: chestY,
						alpha: 0.5,
						duration: distance / (3 * currentSpeed), // Adjust speed effect
						ease: "Quad.In", // Phaser.Math.Easing.Quadratic.In
						onComplete: () => {
							coin.destroy();
						}
					});
				}
			});
		}

		await delay(this.scene, 1000 / currentSpeed);

		this.scene.add.particles(chestX, chestY, 'coin', { // Ensure texture key is correct
			speed: { min: 100, max: 200 },
			lifespan: 500,
			alpha: { start: 1.4, end: 0 },
			angle: { min: 0, max: 360 },
			quantity: coins * 2,
			frequency: 100,
			maxParticles: coins * 2,
			rotate: { min: 0, max: 360 },
			scaleY: { start: -1, end: 1 }
		});
	}
}