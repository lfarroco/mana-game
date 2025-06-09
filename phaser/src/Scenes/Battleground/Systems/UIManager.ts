import Phaser from "phaser";
import * as constants from "../constants";
import { BattlegroundScene } from "../BattlegroundScene";
import { delay, tween } from "../../../Utils/animation";
import { COLOR_BLACK } from "../../../Utils/colors";
import { State } from "../../../Models/State";
import { playerForce } from "../../../Models/Force";
import { Tooltip } from "../../../Systems/Tooltip";

export class UIManager {
	private scene: BattlegroundScene;
	private state: State;

	private uiContainer: Phaser.GameObjects.Container | null = null;
	private goldTextElement: Phaser.GameObjects.Text | null = null;

	public tooltip: Tooltip;

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
		this.state = scene.state; // Or use getState() if preferred globally
		this._setupGoldChangeListener();
		this.tooltip = new Tooltip(scene)
	}

	private _setupGoldChangeListener(): void {
		this.scene.events.on("gold-changed", this._handleGoldChanged, this);
	}

	private _handleGoldChanged(newTotalGold: number, goldDelta: number): void {
		if (this.goldTextElement) {
			this.goldTextElement.setText("Gold: " + newTotalGold);
		}
		if (goldDelta !== 0) { // Play animation only if there's a change
			this.goldChangeAnimation(goldDelta);
		}
	}

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
		const fillColor = 0x2c3e50; // A dark slate blue, good contrast for white text
		const lineColor = 0x000000; // Black outline
		const lineWidth = 4;         // Thick outline

		// Create the graphics object for the button background
		const buttonGraphics = this.scene.add.graphics();

		// Draw the button shape (filled rounded rectangle with an outline)
		buttonGraphics.fillStyle(fillColor, 1);
		buttonGraphics.fillRoundedRect(0, 0, buttonWidth, buttonHeight, cornerRadius);
		buttonGraphics.lineStyle(lineWidth, lineColor, 1);
		buttonGraphics.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, cornerRadius);

		// Position the graphics object so its visual center is at (x, y)
		buttonGraphics.setPosition(x - buttonWidth / 2, y - buttonHeight / 2);

		const buttonText = this.scene.add.text(
			x, y,
			text,
			{
				...constants.defaultTextConfig,
				color: '#ffffff', // White text
				stroke: 'none', // No stroke for the text itself
				strokeThickness: 0,
			}).setOrigin(0.5);

		// Make the graphics object interactive
		// The hit area is relative to the graphics object's origin (top-left)
		const hitArea = new Phaser.Geom.Rectangle(0, 0, buttonWidth, buttonHeight);
		buttonGraphics.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

		// Event handlers (attached to buttonGraphics now)
		buttonGraphics.on(Phaser.Input.Events.POINTER_UP, () => {
			// Reset text shadow from POINTER_DOWN state
			buttonText.setShadow(0, 0, "#000000", 0, true, true);
			callback();
		});

		buttonGraphics.on(Phaser.Input.Events.POINTER_DOWN, () => {
			buttonText.setShadow(0, 0, "#eaeaea", 0, true, true);
		});

		buttonGraphics.on(Phaser.Input.Events.POINTER_OVER, () => {
			buttonText.setShadow(2, 2, "#000000", 2, true, true);
			tween({
				targets: [buttonText],
				scale: 1.2,
			});
		});

		buttonGraphics.on(Phaser.Input.Events.POINTER_OUT, () => {
			buttonText.setShadow(0, 0, "#000000", 0, true, true);
			tween({
				targets: [buttonText],
				scale: 1.0,
			});
		});

		const container = this.scene.add.container(0, 0);
		container.add([buttonGraphics, buttonText]); // Add graphics first, then text
		return container;
	}

	public disableButton(button: Phaser.GameObjects.Container): void {
		const buttonGraphics = button.getAt(0) as Phaser.GameObjects.Graphics;
		const buttonText = button.getAt(1) as Phaser.GameObjects.Text;

		if (buttonGraphics instanceof Phaser.GameObjects.Graphics) {
			buttonGraphics.setAlpha(0.5);
			buttonGraphics.disableInteractive();
		}
		if (buttonText instanceof Phaser.GameObjects.Text) { // Text might not be present in all generic containers
			buttonText.setAlpha(0.5);
		}
	}

	public enableButton(button: Phaser.GameObjects.Container): void {
		const buttonGraphics = button.getAt(0) as Phaser.GameObjects.Graphics;
		const buttonText = button.getAt(1) as Phaser.GameObjects.Text;

		if (buttonGraphics instanceof Phaser.GameObjects.Graphics) {
			buttonGraphics.setAlpha(1);
			buttonGraphics.setInteractive(); // Re-enables with the previously set hit area
		}
		if (buttonText instanceof Phaser.GameObjects.Text) {
			buttonText.setAlpha(1);
		}
	}

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

	public destroyMainUI(): void {
		if (this.uiContainer) {
			this.uiContainer.destroy(true); // true to destroy children
			this.uiContainer = null;
		}
		this.goldTextElement = null; // Was a child of uiContainer
	}

	public destroy(): void { // Full cleanup for the UIManager
		this.destroyMainUI();
		this.scene.events.off("gold-changed", this._handleGoldChanged, this);
	}


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