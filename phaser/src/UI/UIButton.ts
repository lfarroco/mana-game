import Phaser from "phaser";
import { tween } from "../Utils/animation";
import { titleTextConfig } from "../constants/constants";
import { playSoundEffect } from "../Systems/AudioManager";

interface UIButtonState {
	buttonWidth: number;
	buttonHeight: number;
	cornerRadius: number;
	normalFillColor: number;
	hoverFillColor: number;
	pressedFillColor: number;
	lineColor: number;
	lineWidth: number;
}

const uiButtonState = new WeakMap<Phaser.GameObjects.Container, UIButtonState>();

export function createUIButton(
	scene: Phaser.Scene,
	text: string,
	x: number,
	y: number,
	callback: () => void,
	width?: number
): Phaser.GameObjects.Container {
	const container = scene.add.container(0, 0);

	const state: UIButtonState = {
		buttonWidth: width || 280,
		buttonHeight: 60,
		cornerRadius: 10,
		normalFillColor: 0x2c3e50,
		hoverFillColor: 0x34495e,
		pressedFillColor: 0x273746,
		lineColor: 0x000000,
		lineWidth: 4,
	};
	uiButtonState.set(container, state);

	const buttonGraphics = scene.add.graphics();
	buttonGraphics.setName("buttonBackground");
	const st = uiButtonState.get(container)!;
	buttonGraphics.setPosition(x - st.buttonWidth / 2, y - st.buttonHeight / 2);
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

	const hitArea = new Phaser.Geom.Rectangle(0, 0, st.buttonWidth, st.buttonHeight);
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

	container.add(buttonText);
	return container;
}

export function drawUIButtonState(container: Phaser.GameObjects.Container, fill: number) {
	const g = container.getByName("buttonBackground") as Phaser.GameObjects.Graphics;
	if (!g) return;

	const st = uiButtonState.get(container);
	if (!st) return;
	const buttonWidth = st.buttonWidth;
	const buttonHeight = st.buttonHeight;
	const cornerRadius = st.cornerRadius;

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
		const st = uiButtonState.get(container);
		const w = st ? st.buttonWidth : 280;
		const h = st ? st.buttonHeight : 60;
		g.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
	}
	if (t) t.setAlpha(1);
}
