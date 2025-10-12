import Phaser from "phaser";
import { titleTextConfig } from "../constants/constants";
import { playSoundEffect } from "@Systems/AudioManager";
import { createMagicButtonOverlay, MagicOverlayHandle } from "./shaders/magicButtonShader";
import * as io from "@PhaserIO";

type UIButtonState = {
	buttonWidth: number;
	magic?: MagicOverlayHandle;
	isPressed: boolean;
	magicIntensity: number;
}

const buttonsIndex = new WeakMap<Container, UIButtonState>();

const buttonHeight = 60;
const backgroundColor = 0x000000;
const cornerRadius = 10;
const textStyle = {
	...titleTextConfig,
	fontSize: "24px",
	color: "#ffffff",
	stroke: "#000000",
	strokeThickness: 3,
}

export function createUIButton(
	text: string,
	position: { x: number, y: number },
	callback: () => void,
	width?: number
): Container {

	const size = {
		width: width || 280,
		height: buttonHeight
	}

	const state: UIButtonState = {
		buttonWidth: width || 280,
		isPressed: false,
		magicIntensity: 0.45,
	};
	const container = io.Container();

	buttonsIndex.set(container, state);

	const buttonGraphics = io.BorderedRoundRect(
		position,
		{ width: state.buttonWidth, height: buttonHeight },
		cornerRadius,
		backgroundColor,
		1
	);
	io.AddChildren(container, [buttonGraphics]);
	io.SetName(buttonGraphics, "buttonBackground");

	// Add magical shader overlay (between background and label)
	const magic = createMagicButtonOverlay(position, size, cornerRadius);
	io.AddChildren(container, [magic.shader]);
	magic.shader.setName("magicAura");
	state.magic = magic;

	const buttonText = io.Text(position, text, textStyle)
	io.Centralize(buttonText)
	io.SetName(buttonText, "buttonLabel");
	io.SetInteractiveRect(buttonGraphics, size)

	const tweenShaderIntensity = (to: number) => {
		io.Tween({
			targets: [state],
			magicIntensity: to,
			duration: 180,
			onUpdate: () => magic.setIntensity(state.magicIntensity),
			ease: "Sine.easeInOut",
		});
	};

	io.OnPointerDown(buttonGraphics, () => {
		if (!buttonGraphics.input?.enabled) return;
		state.isPressed = true;
		buttonText.setShadow(0, 0, "#eaeaea", 0, true, true);
		tweenShaderIntensity(1.1);
	});

	io.OnPointerUp(buttonGraphics, () => {
		if (!buttonGraphics.input?.enabled) return;
		const wasPressed = state.isPressed;
		state.isPressed = false;
		if (wasPressed) {
			buttonText.setShadow(2, 2, "#000000", 2, true, true);

			playSoundEffect("sfx_unit_onclick");
			tweenShaderIntensity(0.9);
			callback();
		}
	});

	io.OnPointerOver(buttonGraphics, () => {
		if (!buttonGraphics.input?.enabled) return;
		buttonText.setShadow(2, 2, "#000000", 2, true, true);
		tweenShaderIntensity(2.95);
	});

	io.OnPointerOut(buttonGraphics, () => {
		if (!buttonGraphics.input?.enabled) return;
		buttonText.setShadow(0, 0, "#000000", 0, true, true);
		tweenShaderIntensity(0.45);
	});

	io.OnDestroy(container, () => {
		buttonsIndex.delete(container);
	});

	io.AddChildren(container, [buttonText]);
	return container;
}

export function disableUIButton(container: Container) {
	const g = io.GetByName(container, "buttonBackground") as Graphics;
	const t = io.GetByName(container, "buttonLabel") as Phaser.GameObjects.Text;
	g.setAlpha(0.5);
	t.setAlpha(0.5);

	g.disableInteractive();

	const st = buttonsIndex.get(container);
	st!.magic!.setIntensity(0.2);
}

export function enableUIButton(container: Container) {
	const g = io.GetByName(container, "buttonBackground") as Graphics;
	const t = io.GetByName(container, "buttonLabel") as Phaser.GameObjects.Text;
	io.SetAlpha(g, 1);
	io.SetAlpha(t, 1);

	const st = buttonsIndex.get(container);
	io.SetInteractiveRect(g, { width: st!.buttonWidth, height: buttonHeight });

	st!.magic!.setIntensity(0.45);
}

export function updateButtonText(container: Container, text: string) {

	const t = io.GetByName(container, "buttonLabel") as Phaser.GameObjects.Text;
	io.SetText(t, text)

}
