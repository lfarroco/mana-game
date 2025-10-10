import Phaser from "phaser";
import { tween } from "../Utils/animation";
import { titleTextConfig } from "../constants/constants";
import { playSoundEffect } from "@Systems/AudioManager";
import { createMagicButtonOverlay, MagicOverlayHandle } from "./shaders/magicButtonShader";
import { getState } from "@Models/State";

interface UIButtonState {
	buttonWidth: number;
	buttonHeight: number;
	cornerRadius: number;
	normalFillColor: number;
	hoverFillColor: number;
	pressedFillColor: number;
	lineColor: number;
	lineWidth: number;
	magic?: MagicOverlayHandle;
}

const uiButtonsState = new WeakMap<Container, UIButtonState>();

export function createUIButton(
	text: string,
	{ x, y }: { x: number, y: number },
	callback: () => void,
	width?: number
): Container {
	const scene = getState().currentScene;
	const container = scene.add.container(0, 0);

	const state: UIButtonState = {
		buttonWidth: width || 280,
		buttonHeight: 60,
		cornerRadius: 10,
		normalFillColor: 0x22331e,
		hoverFillColor: 0x34495e,
		pressedFillColor: 0x273746,
		lineColor: 0x000000,
		lineWidth: 4,
	};
	uiButtonsState.set(container, state);

	const buttonGraphics = scene.add.graphics();
	buttonGraphics.setName("buttonBackground");
	const st = uiButtonsState.get(container)!;
	buttonGraphics.setPosition(x - st.buttonWidth / 2, y - st.buttonHeight / 2);
	container.add(buttonGraphics);
	drawUIButtonState(container, (container as any).normalFillColor);

	// Add magical shader overlay (between background and label)
	const magic = createMagicButtonOverlay(scene, x, y, st.buttonWidth, st.buttonHeight, st.cornerRadius);
	magic.shader.setName("magicAura");
	container.addAt(magic.shader, 1);
	state.magic = magic;

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

	const tweenIntensity = (to: number, duration = 180) => {
		if (!state.magic) return;
		const shader = state.magic.shader as any;
		if (shader.magicIntensity === undefined) {
			shader.magicIntensity = state.magic.intensityState.value;
		}
		// Tween a custom property on the shader GameObject
		tween({
			targets: [state.magic.shader as unknown as Phaser.GameObjects.GameObject],
			magicIntensity: to as any,
			duration,
			onUpdate: () => state.magic?.setIntensity(shader.magicIntensity),
			ease: "Sine.easeInOut",
		});
	};

	buttonGraphics.on(Phaser.Input.Events.POINTER_DOWN, () => {
		if (!buttonGraphics.input?.enabled) return;
		isPressed = true;
		drawUIButtonState(container, (container as any).pressedFillColor);
		buttonText.setShadow(0, 0, "#eaeaea", 0, true, true);
		tweenIntensity(1.1, 100);
	});

	buttonGraphics.on(Phaser.Input.Events.POINTER_UP, () => {
		if (!buttonGraphics.input?.enabled) return;
		const wasPressed = isPressed;
		isPressed = false;
		if (wasPressed) {
			drawUIButtonState(container, (container as any).hoverFillColor);
			buttonText.setShadow(2, 2, "#000000", 2, true, true);

			playSoundEffect("sfx_unit_onclick");
			tweenIntensity(0.9, 140);
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
		tweenIntensity(0.95);
	});

	buttonGraphics.on(Phaser.Input.Events.POINTER_OUT, () => {
		if (!buttonGraphics.input?.enabled) return;
		drawUIButtonState(container, (container as any).normalFillColor);
		buttonText.setShadow(0, 0, "#000000", 0, true, true);
		tween({ targets: [buttonText], scale: 1.0 });
		tweenIntensity(0.45);
	});

	container.add(buttonText);
	return container;
}

export function drawUIButtonState(container: Container, fill: number) {
	const g = container.getByName("buttonBackground") as Graphics;
	if (!g) return;

	const st = uiButtonsState.get(container);
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

export function disableUIButton(container: Container) {
	const g = container.getByName("buttonBackground") as Graphics;
	const t = container.getByName("buttonLabel") as Phaser.GameObjects.Text;
	if (g) {
		g.setAlpha(0.5);
		g.disableInteractive();
	}
	if (t) t.setAlpha(0.5);

	const st = uiButtonsState.get(container);
	if (st?.magic) {
		(st.magic.shader as any).alpha = 0.5;
		st.magic.setIntensity(0.2);
	}
}

export function enableUIButton(container: Container) {
	const g = container.getByName("buttonBackground") as Graphics;
	const t = container.getByName("buttonLabel") as Phaser.GameObjects.Text;
	if (g) {
		g.setAlpha(1);
		const st = uiButtonsState.get(container);
		const w = st ? st.buttonWidth : 280;
		const h = st ? st.buttonHeight : 60;
		g.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
	}
	if (t) t.setAlpha(1);

	const st2 = uiButtonsState.get(container);
	if (st2?.magic) {
		(st2.magic.shader as any).alpha = 1;
		st2.magic.setIntensity(0.45);
	}
}
