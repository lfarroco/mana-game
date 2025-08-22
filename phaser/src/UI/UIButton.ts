import Phaser from "phaser";
import { tween } from "../Utils/animation";
import { titleTextConfig } from "../constants/constants";
import { playSoundEffect } from "../Systems/AudioManager";

/**
 * Create a button as a container. Returns the container which contains a
 * Graphics named "buttonBackground" and a Text named "buttonLabel".
 */
export function createUIButton(
	scene: Phaser.Scene,
	text: string,
	x: number,
	y: number,
	callback: () => void,
	width?: number
): Phaser.GameObjects.Container {
	const container = scene.add.container(0, 0);

	// store properties on the container so helper functions can access them
	(container as any).buttonWidth = width || 280;
	(container as any).buttonHeight = 60;
	(container as any).cornerRadius = 10;
	(container as any).normalFillColor = 0x2c3e50;
	(container as any).hoverFillColor = 0x34495e;
	(container as any).pressedFillColor = 0x273746;
	(container as any).lineColor = 0x000000;
	(container as any).lineWidth = 4;

	const buttonGraphics = scene.add.graphics();
	buttonGraphics.setName("buttonBackground");
	buttonGraphics.setPosition(x - (container as any).buttonWidth / 2, y - (container as any).buttonHeight / 2);
	// Add graphics to container before drawing so drawUIButtonState can find it via getByName
	container.add(buttonGraphics);
	drawUIButtonState(container, (container as any).normalFillColor);

	const buttonText = scene.add
		.text(
			x,
			y,
			text,
			{
				...titleTextConfig,
				fontSize: "24px",
				color: "#ffffff",
				stroke: "#000000",
				strokeThickness: 3,
			}
		)
		.setOrigin(0.5);
	buttonText.setName("buttonLabel");

	const hitArea = new Phaser.Geom.Rectangle(0, 0, (container as any).buttonWidth, (container as any).buttonHeight);
	buttonGraphics.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

	let isPressed = false;

	buttonGraphics.on(Phaser.Input.Events.POINTER_DOWN, () => {
		if (!buttonGraphics.input?.enabled) return;
		isPressed = true;
		drawUIButtonState(container, (container as any).pressedFillColor);
		buttonText.setShadow(0, 0, "#eaeaea", 0, true, true);
	});

	buttonGraphics.on(Phaser.Input.Events.POINTER_UP, () => {
		if (!buttonGraphics.input?.enabled) return;
		const wasPressed = isPressed;
		isPressed = false;
		if (wasPressed) {
			drawUIButtonState(container, (container as any).hoverFillColor);
			buttonText.setShadow(2, 2, "#000000", 2, true, true);

			playSoundEffect("sfx_unit_onclick");
			callback();
		}
	});

	buttonGraphics.on(Phaser.Input.Events.POINTER_OVER, () => {
		if (!buttonGraphics.input?.enabled) return;
		if (isPressed) {
			drawUIButtonState(container, (container as any).pressedFillColor);
		} else {
			drawUIButtonState(container, (container as any).hoverFillColor);
		}
		buttonText.setShadow(2, 2, "#000000", 2, true, true);
		tween({ targets: [buttonText], scale: 1.2 });
	});

	buttonGraphics.on(Phaser.Input.Events.POINTER_OUT, () => {
		if (!buttonGraphics.input?.enabled) return;
		drawUIButtonState(container, (container as any).normalFillColor);
		buttonText.setShadow(0, 0, "#000000", 0, true, true);
		tween({ targets: [buttonText], scale: 1.0 });
	});

	// graphics already added above
	container.add(buttonText);
	return container;
}

export function drawUIButtonState(container: Phaser.GameObjects.Container, fill: number) {
	const g = container.getByName("buttonBackground") as Phaser.GameObjects.Graphics;
	if (!g) return;

	const buttonWidth = (container as any).buttonWidth as number;
	const buttonHeight = (container as any).buttonHeight as number;
	const cornerRadius = (container as any).cornerRadius as number;

	g.clear();

	const shadowOffset = 4;
	g.fillStyle(0x1a2327, 0.7);
	g.fillRoundedRect(shadowOffset, shadowOffset, buttonWidth, buttonHeight, cornerRadius);

	g.fillStyle(0x2a2a2a, 1);
	g.fillRoundedRect(0, 0, buttonWidth, buttonHeight, cornerRadius);

	const innerPadding = 3;
	g.fillStyle(0x000000, 0.6);
	g.fillRoundedRect(innerPadding, innerPadding, buttonWidth - innerPadding * 2, buttonHeight - innerPadding * 2, cornerRadius - 2);

	g.fillStyle(fill, 1);
	g.fillRoundedRect(innerPadding, innerPadding, buttonWidth - innerPadding * 2, buttonHeight - innerPadding * 2, cornerRadius - 2);

	g.fillStyle(0xffffff, 0.3);
	g.fillRoundedRect(innerPadding + 1, innerPadding + 1, buttonWidth - innerPadding * 2 - 2, (buttonHeight - innerPadding * 2) / 3, cornerRadius - 3);

	const gold = 0xc9a14a;
	g.lineStyle(2, gold, 0.8);
	g.strokeRoundedRect(innerPadding + 0.5, innerPadding + 0.5, buttonWidth - innerPadding * 2 - 1, buttonHeight - innerPadding * 2 - 1, cornerRadius - 2);
}

export function disableUIButton(container: Phaser.GameObjects.Container) {
	const g = container.getByName("buttonBackground") as Phaser.GameObjects.Graphics;
	const t = container.getByName("buttonLabel") as Phaser.GameObjects.Text;
	if (g) {
		g.setAlpha(0.5);
		g.disableInteractive();
	}
	if (t) t.setAlpha(0.5);
}

export function enableUIButton(container: Phaser.GameObjects.Container) {
	const g = container.getByName("buttonBackground") as Phaser.GameObjects.Graphics;
	const t = container.getByName("buttonLabel") as Phaser.GameObjects.Text;
	if (g) {
		g.setAlpha(1);
		g.setInteractive(new Phaser.Geom.Rectangle(0, 0, (container as any).buttonWidth, (container as any).buttonHeight), Phaser.Geom.Rectangle.Contains);
	}
	if (t) t.setAlpha(1);
}
