import Phaser from "phaser";
import { titleTextConfig } from "@Constants/constants";
import { playSoundEffect } from "@Systems/AudioManager";
import { createMagicButtonOverlay, MagicOverlayHandle } from "./magicButtonShader";
import * as io from "@PhaserIO";

export type Button = {
	disable: () => void;
	enable: () => void;
	container: Container;
	text: Phaser.GameObjects.Text;
};

type State = {
	size: Size;
	magic: MagicOverlayHandle;
	isPressed: boolean;
	magicIntensity: number;
	container: Container;
	graphics: Phaser.GameObjects.Graphics;
};

const buttonsIndex = new WeakMap<Container, State>();

const buttonHeight = 60;
const backgroundColor = 0x000000;
const cornerRadius = 10;
const textStyle = {
	...titleTextConfig,
	fontSize: "24px",
	color: "#ffffff",
	stroke: "#000000",
	fontStyle: "bold",
	strokeThickness: 3,
};

export function createUIButton(
	text: string,
	position: Vec2,
	callback: () => void,
	width?: number
): Button {
	const size = {
		width: width || 280,
		height: buttonHeight,
	};
	const container = io.Container();

	const magic = createMagicButtonOverlay(position, size);

	const buttonGraphics = io.BorderedRoundRect(position, size, cornerRadius, backgroundColor, 1);

	io.SetInteractiveRect(size)(buttonGraphics);

	const buttonText = io.Text(text, textStyle);
	io.SetPosition(buttonText, position);
	io.Centralize(buttonText);

	io.AddChildren(container, [buttonGraphics, magic.shader, buttonText]);

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
		tweenShaderIntensity(3.1);
	});

	io.OnPointerUp(buttonGraphics, () => {
		if (!buttonGraphics.input?.enabled) return;
		const wasPressed = state.isPressed;
		state.isPressed = false;
		if (wasPressed) {
			playSoundEffect("sfx_unit_onclick");
			tweenShaderIntensity(0.1);
			callback();
		}
	});

	io.OnPointerOver(buttonGraphics, () => {
		if (!buttonGraphics.input?.enabled) return;
		tweenShaderIntensity(2.1);
	});

	io.OnPointerOut(buttonGraphics, () => {
		if (!buttonGraphics.input?.enabled) return;
		tweenShaderIntensity(0.45);
	});

	io.OnceDestroyed(container, () => {
		buttonsIndex.delete(container);
	});

	const state: State = {
		size,
		isPressed: false,
		magicIntensity: 0.45,
		magic,
		container,
		graphics: buttonGraphics,
	};

	buttonsIndex.set(container, state);

	return {
		disable: () => disableUIButton(state),
		enable: () => enableUIButton(state),
		text: buttonText,
		container,
	};
}

export function disableUIButton(state: State) {
	io.SetAlpha(state.graphics, 0.5);

	io.DisableInteractive(state.graphics);

	state.magic.setIntensity(0.2);
}

export function enableUIButton(state: State) {
	io.SetAlpha(state.graphics, 1);

	io.SetInteractiveRect(state.size)(state.graphics);

	state.magic.setIntensity(0.45);
}
