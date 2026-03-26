import Phaser from "phaser";
import { titleTextConfig } from "@Constants/constants";
import { playSoundEffect } from "@Systems/AudioManager";
import { createMagicButtonOverlay, MagicOverlayHandle } from "@Components/magicButtonShader";
import * as io from "@PhaserIO";
import { createLogger } from "@Utils/Logger";
import { findNextFocusable, FocusableEntry } from "@Systems/Controls/navigation";
import { NavigationDirection } from "@Systems/Controls/intents";

const logger = createLogger("UIButton");

// UI button styling constants
const BUTTON_HEIGHT = 60;
const BUTTON_BG_COLOR = 0x000000;
const BUTTON_CORNER_RADIUS = 10;
const BUTTON_TEXT_FONT_SIZE = "24px";
const BUTTON_SHADER_TWEEN_DURATION_MS = 180;
const BUTTON_BORDER_WIDTH = 2;
const BUTTON_BORDER_COLOR = 0xffffff;
const BUTTON_BORDER_ALPHA = 0.5;
const BUTTON_FOCUS_BORDER_COLOR = 0xffd700;
const BUTTON_FOCUS_BORDER_ALPHA = 1;
let buttonInstanceCounter = 0;

export const activeButtons: Record<string, () => void> = {};
if (typeof window !== "undefined") {
	(window as Window & { _activeButtons?: typeof activeButtons })._activeButtons = activeButtons;
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
	focus: () => void;
	blur: () => void;
	press: () => void;
	container: Container;
	text: Phaser.GameObjects.Text;
};

type State = {
	id: string;
	size: Size;
	magic: MagicOverlayHandle;
	isPressed: boolean;
	isHovered: boolean;
	isFocused: boolean;
	magicIntensity: number;
	container: Container;
	graphics: Phaser.GameObjects.Graphics;
	text: Phaser.GameObjects.Text;
	callback: () => void;
};

const buttonsIndex = new WeakMap<Container, State>();
const registeredButtons = new Set<State>();
const focusedButtons = new WeakMap<Phaser.Scene, State>();

const textStyle = {
	...titleTextConfig,
	fontSize: BUTTON_TEXT_FONT_SIZE,
	color: "#ffffff",
	stroke: "#000000",
	fontStyle: "bold",
	strokeThickness: 3,
};

const renderButtonGraphics = (state: State) => {
	const borderColor = state.isFocused ? BUTTON_FOCUS_BORDER_COLOR : BUTTON_BORDER_COLOR;
	const borderAlpha = state.isFocused ? BUTTON_FOCUS_BORDER_ALPHA : BUTTON_BORDER_ALPHA;

	state.graphics.clear();
	state.graphics.lineStyle(BUTTON_BORDER_WIDTH, borderColor, borderAlpha);
	state.graphics.fillStyle(BUTTON_BG_COLOR, 1);
	state.graphics.fillRoundedRect(0, 0, state.size.width, state.size.height, BUTTON_CORNER_RADIUS);
	state.graphics.strokeRoundedRect(0, 0, state.size.width, state.size.height, BUTTON_CORNER_RADIUS);
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

	const syncVisualState = () => {
		renderButtonGraphics(state);

		if (!buttonGraphics.input?.enabled) {
			state.magic.setIntensity(0.2);
			buttonText.setScale(1);
			return;
		}

		if (state.isPressed) {
			buttonText.setScale(1);
			tweenShaderIntensity(3.1);
			return;
		}

		if (state.isHovered) {
			buttonText.setScale(1.02);
			tweenShaderIntensity(2.1);
			return;
		}

		if (state.isFocused) {
			buttonText.setScale(1);
			tweenShaderIntensity(0.45);
			return;
		}

		buttonText.setScale(1);
		tweenShaderIntensity(0.45);
	};

	const activate = () => {
		if (!buttonGraphics.input?.enabled) return;
		playSoundEffect("sfx_unit_onclick");
		callback();
	};

	io.OnPointerDown(buttonGraphics, () => {
		logger.debug(`DEBUG: UIButton PointerDown ${text}`);
		if (!buttonGraphics.input?.enabled) return;
		state.isPressed = true;
		syncVisualState();
	});

	io.OnPointerUp(buttonGraphics, () => {
		logger.debug(`DEBUG: UIButton PointerUp ${text}`);
		if (!buttonGraphics.input?.enabled) return;
		const wasPressed = state.isPressed;
		state.isPressed = false;
		if (wasPressed) {
			activate();
		} else {
			logger.debug(`DEBUG: UIButton PointerUp but not pressed`);
		}
		syncVisualState();
	});

	io.OnPointerOver(buttonGraphics, () => {
		if (!buttonGraphics.input?.enabled) return;
		state.isHovered = true;
		syncVisualState();
	});

	io.OnPointerOut(buttonGraphics, () => {
		if (!buttonGraphics.input?.enabled) return;
		state.isHovered = false;
		state.isPressed = false;
		syncVisualState();
	});

	io.OnceDestroyed(container, () => {
		registeredButtons.delete(state);
		const focusedButton = focusedButtons.get(container.scene);
		if (focusedButton === state) {
			focusedButtons.delete(container.scene);
		}
		buttonsIndex.delete(container);
		unregisterButton(text);
	});

	const state: State = {
		id: `button-${buttonInstanceCounter++}`,
		size,
		isPressed: false,
		isHovered: false,
		isFocused: false,
		magicIntensity: 0.45,
		magic,
		container,
		graphics: buttonGraphics,
		text: buttonText,
		callback,
	};

	buttonsIndex.set(container, state);
	registeredButtons.add(state);
	registerButton(text, callback);
	syncVisualState();

	return {
		disable: () => disableUIButton(state),
		enable: () => enableUIButton(state),
		focus: () => setFocusedButton(state),
		blur: () => clearButtonFocus(state),
		press: activate,
		text: buttonText,
		container,
	};
}

export function disableUIButton(state: State) {
	io.SetAlpha(state.graphics, 0.5);

	io.DisableInteractive(state.graphics);

	state.text.setAlpha(0.7);
	state.isPressed = false;
	state.isHovered = false;
	if (state.isFocused) {
		clearButtonFocus(state);
	}
	state.magic.setIntensity(0.2);
	renderButtonGraphics(state);
}

export function enableUIButton(state: State) {
	io.SetAlpha(state.graphics, 1);
	state.text.setAlpha(1);

	io.SetInteractiveRect(state.size)(state.graphics);

	state.magic.setIntensity(0.45);
	renderButtonGraphics(state);
}

const isVisibleInHierarchy = (gameObject: Phaser.GameObjects.GameObject | null): boolean => {
	let current = gameObject as (Phaser.GameObjects.GameObject & {
		visible?: boolean;
		active?: boolean;
		parentContainer?: Phaser.GameObjects.Container | null;
	}) | null;

	while (current) {
		if (current.active === false || current.visible === false) {
			return false;
		}
		current = current.parentContainer ?? null;
	}

	return true;
};

const isButtonNavigable = (state: State, scene: Phaser.Scene): boolean => {
	return (
		state.container.scene === scene &&
		!!state.graphics.input?.enabled &&
		isVisibleInHierarchy(state.container)
	);
};

const getSceneButtons = (scene: Phaser.Scene): State[] => {
	return [...registeredButtons].filter((state) => isButtonNavigable(state, scene));
};

const toFocusableEntry = (state: State): FocusableEntry => ({
	id: state.id,
	x: state.text.x,
	y: state.text.y,
});

const setFocusedButton = (state: State) => {
	const scene = state.container.scene;
	const previous = focusedButtons.get(scene);
	if (previous === state) {
		return;
	}

	if (previous) {
		previous.isFocused = false;
		previous.text.setScale(1);
		renderButtonGraphics(previous);
	}

	state.isFocused = true;
	focusedButtons.set(scene, state);
	state.text.setScale(1);
	state.magic.setIntensity(0.45);
	renderButtonGraphics(state);
};

const clearButtonFocus = (state: State) => {
	state.isFocused = false;
	const focused = focusedButtons.get(state.container.scene);
	if (focused === state) {
		focusedButtons.delete(state.container.scene);
	}
	state.text.setScale(1);
	state.magic.setIntensity(0.45);
	renderButtonGraphics(state);
};

export const hasNavigableButtons = (scene: Phaser.Scene): boolean => getSceneButtons(scene).length > 0;

export const focusNextSceneButton = (
	scene: Phaser.Scene,
	direction: NavigationDirection
): Button | null => {
	const buttons = getSceneButtons(scene);
	const focused = focusedButtons.get(scene);
	const next = findNextFocusable(
		buttons.map(toFocusableEntry),
		focused?.id ?? null,
		direction
	);
	if (!next) {
		return null;
	}

	const target = buttons.find((state) => state.id === next.id);
	if (!target) {
		return null;
	}

	setFocusedButton(target);
	return {
		disable: () => disableUIButton(target),
		enable: () => enableUIButton(target),
		focus: () => setFocusedButton(target),
		blur: () => clearButtonFocus(target),
		press: () => target.callback(),
		container: target.container,
		text: target.text,
	};
};

export const activateFocusedSceneButton = (scene: Phaser.Scene): boolean => {
	const focused = focusedButtons.get(scene);
	if (!focused || !isButtonNavigable(focused, scene)) {
		const firstButton = focusNextSceneButton(scene, "down");
		if (!firstButton) {
			return false;
		}
		firstButton.press();
		return true;
	}

	focused.callback();
	return true;
};

export const clearSceneButtonFocus = (scene: Phaser.Scene): void => {
	const focused = focusedButtons.get(scene);
	if (!focused) {
		return;
	}

	clearButtonFocus(focused);
};
