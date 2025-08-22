import Phaser from "phaser";
import { tween } from "../Utils/animation";
import { titleTextConfig } from "../constants/constants";
import { playSoundEffect } from "../Systems/AudioManager";

export class UIButton extends Phaser.GameObjects.Container {
	buttonGraphics: Phaser.GameObjects.Graphics;
	buttonText: Phaser.GameObjects.Text;
	isPressed: boolean = false;

	readonly buttonWidth: number;
	readonly buttonHeight = 60;
	readonly cornerRadius = 10;
	readonly normalFillColor = 0x2c3e50;
	readonly hoverFillColor = 0x34495e;
	readonly pressedFillColor = 0x273746;
	readonly lineColor = 0x000000;
	readonly lineWidth = 4;

	constructor(
		scene: Phaser.Scene,
		text: string,
		x: number,
		y: number,
		callback: () => void,
		width?: number
	) {
		super(scene, 0, 0);
		scene.add.existing(this);

		(this as any).buttonWidth = width || 280;

		this.buttonGraphics = scene.add.graphics();
		this.buttonGraphics.setName("buttonBackground");
		this._drawButtonState(this.normalFillColor);
		this.buttonGraphics.setPosition(x - this.buttonWidth / 2, y - this.buttonHeight / 2);

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
			if (wasPressed) {
				this._drawButtonState(this.hoverFillColor);
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

	_drawButtonState(fill: number) {
		this.buttonGraphics.clear();

		const shadowOffset = 4;
		this.buttonGraphics.fillStyle(0x1a2327, 0.7);
		this.buttonGraphics.fillRoundedRect(
			shadowOffset,
			shadowOffset,
			this.buttonWidth,
			this.buttonHeight,
			this.cornerRadius
		);

		this.buttonGraphics.fillStyle(0x2a2a2a, 1);
		this.buttonGraphics.fillRoundedRect(
			0,
			0,
			this.buttonWidth,
			this.buttonHeight,
			this.cornerRadius
		);

		const innerPadding = 3;
		this.buttonGraphics.fillStyle(0x000000, 0.6);
		this.buttonGraphics.fillRoundedRect(
			innerPadding,
			innerPadding,
			this.buttonWidth - (innerPadding * 2),
			this.buttonHeight - (innerPadding * 2),
			this.cornerRadius - 2
		);

		this.buttonGraphics.fillStyle(fill, 1);
		this.buttonGraphics.fillRoundedRect(
			innerPadding,
			innerPadding,
			this.buttonWidth - (innerPadding * 2),
			this.buttonHeight - (innerPadding * 2),
			this.cornerRadius - 2
		);

		this.buttonGraphics.fillStyle(0xffffff, 0.3);
		this.buttonGraphics.fillRoundedRect(
			innerPadding + 1,
			innerPadding + 1,
			this.buttonWidth - (innerPadding * 2) - 2,
			(this.buttonHeight - (innerPadding * 2)) / 3,
			this.cornerRadius - 3
		);

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

	disable() {
		this.buttonGraphics.setAlpha(0.5);
		this.buttonGraphics.disableInteractive();
		this.buttonText.setAlpha(0.5);
	}

	enable() {
		this.buttonGraphics.setAlpha(1);
		this.buttonGraphics.setInteractive();
		this.buttonText.setAlpha(1);
	}
}
