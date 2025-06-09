import Phaser from "phaser";
import * as constants from "../constants";
import { tween } from "../../../Utils/animation";

/**
 * UIButton encapsulates a styled, interactive button for Phaser scenes.
 * Handles its own visuals, interactivity, and callback logic.
 */
export class UIButton extends Phaser.GameObjects.Container {
	private buttonGraphics: Phaser.GameObjects.Graphics;
	private buttonText: Phaser.GameObjects.Text;
	private isPressed: boolean = false;
	private readonly buttonWidth = 180;
	private readonly buttonHeight = 50;
	private readonly cornerRadius = 10;
	private readonly normalFillColor = 0x2c3e50;
	private readonly hoverFillColor = 0x34495e;
	private readonly pressedFillColor = 0x273746;
	private readonly lineColor = 0x000000;
	private readonly lineWidth = 4;

	constructor(
		scene: Phaser.Scene,
		text: string,
		x: number,
		y: number,
		callback: () => void
	) {
		super(scene, 0, 0);
		scene.add.existing(this);

		// Button background
		this.buttonGraphics = scene.add.graphics();
		this.buttonGraphics.setName("buttonBackground");
		this.drawButtonState(this.normalFillColor);
		this.buttonGraphics.setPosition(x - this.buttonWidth / 2, y - this.buttonHeight / 2);

		// Button label
		this.buttonText = scene.add.text(
			x, y,
			text,
			{
				...constants.defaultTextConfig,
				color: '#ffffff',
				stroke: 'none',
				strokeThickness: 0,
			}
		).setOrigin(0.5);
		this.buttonText.setName("buttonLabel");

		// Interactivity
		const hitArea = new Phaser.Geom.Rectangle(0, 0, this.buttonWidth, this.buttonHeight);
		this.buttonGraphics.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

		this.buttonGraphics.on(Phaser.Input.Events.POINTER_DOWN, () => {
			if (!this.buttonGraphics.input?.enabled) return;
			this.isPressed = true;
			this.drawButtonState(this.pressedFillColor);
			this.buttonText.setShadow(0, 0, "#eaeaea", 0, true, true);
		});
		this.buttonGraphics.on(Phaser.Input.Events.POINTER_UP, () => {
			if (!this.buttonGraphics.input?.enabled) return;
			const wasPressed = this.isPressed;
			this.isPressed = false;
			if (wasPressed) {
				this.drawButtonState(this.hoverFillColor);
				this.buttonText.setShadow(2, 2, "#000000", 2, true, true);
				callback();
			}
		});
		this.buttonGraphics.on(Phaser.Input.Events.POINTER_OVER, () => {
			if (!this.buttonGraphics.input?.enabled) return;
			if (this.isPressed) {
				this.drawButtonState(this.pressedFillColor);
			} else {
				this.drawButtonState(this.hoverFillColor);
			}
			this.buttonText.setShadow(2, 2, "#000000", 2, true, true);
			tween({ targets: [this.buttonText], scale: 1.2 });
		});
		this.buttonGraphics.on(Phaser.Input.Events.POINTER_OUT, () => {
			if (!this.buttonGraphics.input?.enabled) return;
			this.drawButtonState(this.normalFillColor);
			this.buttonText.setShadow(0, 0, "#000000", 0, true, true);
			tween({ targets: [this.buttonText], scale: 1.0 });
		});

		this.add([this.buttonGraphics, this.buttonText]);
	}

	private drawButtonState(fill: number) {
		this.buttonGraphics.clear();
		this.buttonGraphics.fillStyle(fill, 1);
		this.buttonGraphics.fillRoundedRect(0, 0, this.buttonWidth, this.buttonHeight, this.cornerRadius);
		this.buttonGraphics.lineStyle(this.lineWidth, this.lineColor, 1);
		this.buttonGraphics.strokeRoundedRect(0, 0, this.buttonWidth, this.buttonHeight, this.cornerRadius);
	}

	/** Disables the button visually and functionally. */
	public disable() {
		this.buttonGraphics.setAlpha(0.5);
		this.buttonGraphics.disableInteractive();
		this.buttonText.setAlpha(0.5);
	}

	/** Enables the button visually and functionally. */
	public enable() {
		this.buttonGraphics.setAlpha(1);
		this.buttonGraphics.setInteractive();
		this.buttonText.setAlpha(1);
	}
}
