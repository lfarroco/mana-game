import Phaser from "phaser";
import { titleTextConfig } from "@Constants/constants";
import { playSoundEffect } from "@Systems/AudioManager";
import { createMagicButtonOverlay, MagicOverlayHandle } from "@Components/magicButtonShader";
import * as io from "@PhaserIO";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("UIButton");

// UI button styling constants
const BUTTON_HEIGHT = 60;
const BUTTON_BG_COLOR = 0x000000;
const BUTTON_CORNER_RADIUS = 10;
const BUTTON_TEXT_FONT_SIZE = "24px";
const BUTTON_SHADER_TWEEN_DURATION_MS = 180;

export const activeButtons: Record<string, () => void> = {};
if (typeof window !== "undefined") {
	(window as Window & { _activeButtons?: typeof activeButtons })._activeButtons = activeButtons;
}

export function triggerButton(text: string): boolean {
	const key = text.toUpperCase();
	if (activeButtons[key]) {
		activeButtons[key]();
		return true;
	}
	return false;
}

export function registerButton(text: string, callback: () => void) {
	const key = text.toUpperCase();
	activeButtons[key] = callback;
}

export function unregisterButton(text: string) {
	const key = text.toUpperCase();
	delete activeButtons[key];
}

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

const textStyle = {
	...titleTextConfig,
	fontSize: BUTTON_TEXT_FONT_SIZE,
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
	logger.debug(`DEBUG: createUIButton called for ${text}`);
	const size = {
		width: width || 280,
		height: BUTTON_HEIGHT,
	};
	const container = io.Container();

	const magic = createMagicButtonOverlay(position, size);

	const buttonGraphics = io.BorderedRoundRect(
		position,
		size,
		BUTTON_CORNER_RADIUS,
		BUTTON_BG_COLOR,
		1
	);

	io.SetInteractiveRect(size)(buttonGraphics);

	const buttonText = io.Text(text, textStyle);
	io.SetPosition(buttonText, position);
	io.Centralize(buttonText);

	io.AddChildren(container, [buttonGraphics, magic.shader, buttonText]);

	const tweenShaderIntensity = (to: number) => {
		io.Tween({
			targets: [state],
			magicIntensity: to,
			duration: BUTTON_SHADER_TWEEN_DURATION_MS,
			onUpdate: () => magic.setIntensity(state.magicIntensity),
			ease: "Sine.easeInOut",
		});
	};

	io.OnPointerDown(buttonGraphics, () => {
		logger.debug(`DEBUG: UIButton PointerDown ${text}`);
		if (!buttonGraphics.input?.enabled) return;
		state.isPressed = true;
		tweenShaderIntensity(3.1);
	});

	io.OnPointerUp(buttonGraphics, () => {
		logger.debug(`DEBUG: UIButton PointerUp ${text}`);
		if (!buttonGraphics.input?.enabled) return;
		const wasPressed = state.isPressed;
		state.isPressed = false;
		if (wasPressed) {
			playSoundEffect("sfx_unit_onclick");
			tweenShaderIntensity(0.1);
			callback();
		} else {
			logger.debug(`DEBUG: UIButton PointerUp but not pressed`);
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
		unregisterButton(text);
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
	registerButton(text, callback);

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
