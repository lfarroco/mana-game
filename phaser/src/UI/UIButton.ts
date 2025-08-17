import Phaser from "phaser";
import { tween } from "../Utils/animation";
import { titleTextConfig } from "../constants/constants";
import { playSoundEffect } from "../Systems/AudioManager";

/**
 * A reusable, interactive button component for Phaser scenes.
 * This class encapsulates the creation of a button with distinct visual states
 * (normal, hover, pressed), handles pointer interactions, and executes a
 * callback function when clicked. It extends `Phaser.GameObjects.Container`
 * to group its graphical elements.
 */
export class UIButton extends Phaser.GameObjects.Container {
	/** The Phaser.GameObjects.Graphics object used to draw the button's background and states. */
	buttonGraphics: Phaser.GameObjects.Graphics;
	/** The Phaser.GameObjects.Text object displaying the button's label. */
	buttonText: Phaser.GameObjects.Text;
	/** Flag indicating if the button is currently in a pressed state (mouse down over button). */
	isPressed: boolean = false;

	// These could be parameterized in the constructor or a config object for more flexibility.
	readonly buttonWidth: number;
	readonly buttonHeight = 60;
	readonly cornerRadius = 10;
	/** Fill color for the button in its normal, non-interactive state. */
	readonly normalFillColor = 0x2c3e50;
	/** Fill color when the pointer hovers over the button. */
	readonly hoverFillColor = 0x34495e;
	/** Fill color when the button is pressed. */
	readonly pressedFillColor = 0x273746;
	/** Color of the button's outline. */
	readonly lineColor = 0x000000;
	/** Width of the button's outline. */
	readonly lineWidth = 4;

	constructor(
		scene: Phaser.Scene,
		text: string,
		x: number, // Center X position for the button
		y: number, // Center Y position for the button
		callback: () => void,
		width?: number // Optional width parameter (defaults to 280)
	) {
		super(scene, 0, 0);
		scene.add.existing(this);

		// Set button width (use provided width or default to 280)
		(this as any).buttonWidth = width || 280;

		// Button background
		this.buttonGraphics = scene.add.graphics();
		this.buttonGraphics.setName("buttonBackground");
		this._drawButtonState(this.normalFillColor);
		this.buttonGraphics.setPosition(x - this.buttonWidth / 2, y - this.buttonHeight / 2);

		// Button label (using same font style as stylized bars)
		this.buttonText = scene.add.text(
			x, y,
			text,
			{
				...titleTextConfig,
				fontSize: '24px',
				color: '#ffffff',
				stroke: '#000000',
				strokeThickness: 3
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

				playSoundEffect('sfx_unit_onclick');
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
	_drawButtonState(fill: number) {
		this.buttonGraphics.clear();

		// --- Drop shadow (similar to stylized bar) ---
		const shadowOffset = 4;
		this.buttonGraphics.fillStyle(0x1a2327, 0.7); // dark shadow color
		this.buttonGraphics.fillRoundedRect(
			shadowOffset,
			shadowOffset,
			this.buttonWidth,
			this.buttonHeight,
			this.cornerRadius
		);

		// --- Outer border (dark like stylized bar) ---
		this.buttonGraphics.fillStyle(0x2a2a2a, 1); // Dark border similar to stylized bar
		this.buttonGraphics.fillRoundedRect(
			0,
			0,
			this.buttonWidth,
			this.buttonHeight,
			this.cornerRadius
		);

		// --- Inner background/border area ---
		const innerPadding = 3;
		this.buttonGraphics.fillStyle(0x000000, 0.6); // Semi-transparent background
		this.buttonGraphics.fillRoundedRect(
			innerPadding,
			innerPadding,
			this.buttonWidth - (innerPadding * 2),
			this.buttonHeight - (innerPadding * 2),
			this.cornerRadius - 2
		);

		// --- Button main fill (preserving original colors) ---
		this.buttonGraphics.fillStyle(fill, 1);
		this.buttonGraphics.fillRoundedRect(
			innerPadding,
			innerPadding,
			this.buttonWidth - (innerPadding * 2),
			this.buttonHeight - (innerPadding * 2),
			this.cornerRadius - 2
		);

		// --- Inner highlight (top shine effect like stylized bar) ---
		this.buttonGraphics.fillStyle(0xffffff, 0.3); // White highlight with transparency
		this.buttonGraphics.fillRoundedRect(
			innerPadding + 1,
			innerPadding + 1,
			this.buttonWidth - (innerPadding * 2) - 2,
			(this.buttonHeight - (innerPadding * 2)) / 3, // Top third for highlight
			this.cornerRadius - 3
		);

		// --- Gold accent border (preserving original gold accent) ---
		const gold = 0xc9a14a;
		this.buttonGraphics.lineStyle(2, gold, 0.8);
		this.buttonGraphics.strokeRoundedRect(
			innerPadding + 0.5,
			innerPadding + 0.5,
			this.buttonWidth - (innerPadding * 2) - 1,
			this.buttonHeight - (innerPadding * 2) - 1,
			this.cornerRadius - 2
		);
	}

	/** Disables the button visually and functionally. */
	disable() {
		this.buttonGraphics.setAlpha(0.5);
		this.buttonGraphics.disableInteractive();
		this.buttonText.setAlpha(0.5);
	}

	/** Enables the button visually and functionally. */
	enable() {
		this.buttonGraphics.setAlpha(1);
		this.buttonGraphics.setInteractive();
		this.buttonText.setAlpha(1);
	}
}
