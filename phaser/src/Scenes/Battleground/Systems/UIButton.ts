import Phaser from "phaser";
import * as constants from "../constants";
import { tween } from "../../../Utils/animation";

/**
 * A reusable, interactive button component for Phaser scenes.
 * This class encapsulates the creation of a button with distinct visual states
 * (normal, hover, pressed), handles pointer interactions, and executes a
 * callback function when clicked. It extends `Phaser.GameObjects.Container`
 * to group its graphical elements.
 */
export class UIButton extends Phaser.GameObjects.Container {
	/** The Phaser.GameObjects.Graphics object used to draw the button's background and states. */
	private buttonGraphics: Phaser.GameObjects.Graphics;
	/** The Phaser.GameObjects.Text object displaying the button's label. */
	private buttonText: Phaser.GameObjects.Text;
	/** Flag indicating if the button is currently in a pressed state (mouse down over button). */
	private isPressed: boolean = false;

	// Private readonly constants defining the button's appearance.
	// These could be parameterized in the constructor or a config object for more flexibility.
	private readonly buttonWidth = 180;
	private readonly buttonHeight = 50;
	private readonly cornerRadius = 10;
	/** Fill color for the button in its normal, non-interactive state. */
	private readonly normalFillColor = 0x2c3e50;
	/** Fill color when the pointer hovers over the button. */
	private readonly hoverFillColor = 0x34495e;
	/** Fill color when the button is pressed. */
	private readonly pressedFillColor = 0x273746;
	/** Color of the button's outline. */
	private readonly lineColor = 0x000000;
	/** Width of the button's outline. */
	private readonly lineWidth = 4;

	constructor(
		scene: Phaser.Scene,
		text: string,
		x: number, // Center X position for the button
		y: number, // Center Y position for the button
		callback: () => void
	) {
		super(scene, 0, 0);
		scene.add.existing(this);

		// Button background
		this.buttonGraphics = scene.add.graphics();
		this.buttonGraphics.setName("buttonBackground");
		this._drawButtonState(this.normalFillColor);
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
			this._drawButtonState(this.pressedFillColor);
			this.buttonText.setShadow(0, 0, "#eaeaea", 0, true, true);
		});
		this.buttonGraphics.on(Phaser.Input.Events.POINTER_UP, () => {
			if (!this.buttonGraphics.input?.enabled) return;
			const wasPressed = this.isPressed;
			this.isPressed = false;
			if (wasPressed) { // Only trigger callback if pointer up happens over the button while it was pressed
				this._drawButtonState(this.hoverFillColor); // Assume pointer is still over, show hover
				this.buttonText.setShadow(2, 2, "#000000", 2, true, true);
				callback();
			}
		});
		this.buttonGraphics.on(Phaser.Input.Events.POINTER_OVER, () => {
			if (!this.buttonGraphics.input?.enabled) return;
			if (this.isPressed) {
				this._drawButtonState(this.pressedFillColor);
			} else {
				this._drawButtonState(this.hoverFillColor);
			}
			this.buttonText.setShadow(2, 2, "#000000", 2, true, true);
			tween({ targets: [this.buttonText], scale: 1.2 });
		});
		this.buttonGraphics.on(Phaser.Input.Events.POINTER_OUT, () => {
			if (!this.buttonGraphics.input?.enabled) return;
			this._drawButtonState(this.normalFillColor);
			this.buttonText.setShadow(0, 0, "#000000", 0, true, true);
			tween({ targets: [this.buttonText], scale: 1.0 });
		});

		this.add([this.buttonGraphics, this.buttonText]);
	}

	/**
	 * Redraws the button's visual state (background fill and stroke)
	 * based on the provided fill color.
	 * @param fill - The color to use for the button's fill.
	 */
	private _drawButtonState(fill: number) {
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
