import Phaser from "phaser";
import { titleTextConfig } from "@Constants/constants";
import { playSoundEffect } from "@Systems/AudioManager";
import * as io from "@PhaserIO";
import { createLogger } from "@Utils/Logger";
import { findNextFocusable, FocusableEntry } from "@Systems/Controls/navigation";
import { NavigationDirection } from "@Systems/Controls/intents";

const logger = createLogger("UIButton");

// UI button styling constants
const BUTTON_HEIGHT = 60;
const BUTTON_BG_COLOR = 0x08121f;
const BUTTON_CORNER_RADIUS = 10;
const BUTTON_TEXT_FONT_SIZE = "24px";
const BUTTON_BORDER_WIDTH = 2;
const BUTTON_BORDER_COLOR = 0x7ae7ff;
const BUTTON_BORDER_ALPHA = 0.7;
const BUTTON_HOVER_BORDER_COLOR = 0x9cefff;
const BUTTON_HOVER_BORDER_ALPHA = 1;
const BUTTON_FOCUS_BORDER_COLOR = 0x7ae7ff;
const BUTTON_FOCUS_BORDER_ALPHA = 1;
const BUTTON_BG_ALPHA = 0.42;
const BUTTON_HOVER_BG_ALPHA = 0.52;
const BUTTON_FOCUS_BG_ALPHA = 0.5;
const BUTTON_PRESSED_BG_ALPHA = 0.62;
const BUTTON_DISABLED_BG_ALPHA = 0.18;
const BUTTON_DISABLED_BORDER_ALPHA = 0.3;
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
	isPressed: boolean;
	isHovered: boolean;
	isFocused: boolean;
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
	strokeThickness: 2,
};

type ButtonVisualStyle = {
	backgroundAlpha: number;
	borderColor: number;
	borderAlpha: number;
	textScale: number;
	textAlpha: number;
};

const getButtonVisualStyle = (state: State): ButtonVisualStyle => {
	if (!state.graphics.input?.enabled) {
		return {
			backgroundAlpha: BUTTON_DISABLED_BG_ALPHA,
			borderColor: BUTTON_BORDER_COLOR,
			borderAlpha: BUTTON_DISABLED_BORDER_ALPHA,
			textScale: 1,
			textAlpha: 0.65,
		};
	}

	if (state.isPressed) {
		return {
			backgroundAlpha: BUTTON_PRESSED_BG_ALPHA,
			borderColor: BUTTON_HOVER_BORDER_COLOR,
			borderAlpha: BUTTON_HOVER_BORDER_ALPHA,
			textScale: 0.99,
			textAlpha: 1,
		};
	}

	if (state.isHovered) {
		return {
			backgroundAlpha: BUTTON_HOVER_BG_ALPHA,
			borderColor: BUTTON_HOVER_BORDER_COLOR,
			borderAlpha: BUTTON_HOVER_BORDER_ALPHA,
			textScale: 1.02,
			textAlpha: 1,
		};
	}

	if (state.isFocused) {
		return {
			backgroundAlpha: BUTTON_FOCUS_BG_ALPHA,
			borderColor: BUTTON_FOCUS_BORDER_COLOR,
			borderAlpha: BUTTON_FOCUS_BORDER_ALPHA,
			textScale: 1.01,
			textAlpha: 1,
		};
	}

	return {
		backgroundAlpha: BUTTON_BG_ALPHA,
		borderColor: BUTTON_BORDER_COLOR,
		borderAlpha: BUTTON_BORDER_ALPHA,
		textScale: 1,
		textAlpha: 1,
	};
};

const renderButtonGraphics = (state: State) => {
	const visuals = getButtonVisualStyle(state);

	state.graphics.clear();
	state.graphics.lineStyle(BUTTON_BORDER_WIDTH, visuals.borderColor, visuals.borderAlpha);
	state.graphics.fillStyle(BUTTON_BG_COLOR, visuals.backgroundAlpha);
	state.graphics.fillRoundedRect(0, 0, state.size.width, state.size.height, BUTTON_CORNER_RADIUS);
	state.graphics.strokeRoundedRect(0, 0, state.size.width, state.size.height, BUTTON_CORNER_RADIUS);
	state.text.setScale(visuals.textScale);
	state.text.setAlpha(visuals.textAlpha);
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

	io.AddChildren(container, [buttonGraphics, buttonText]);

	const syncVisualState = () => {
		renderButtonGraphics(state);
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

	state.isPressed = false;
	state.isHovered = false;
	if (state.isFocused) {
		clearButtonFocus(state);
	}
	renderButtonGraphics(state);
}

export function enableUIButton(state: State) {
	io.SetAlpha(state.graphics, 1);

	io.SetInteractiveRect(state.size)(state.graphics);

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
	renderButtonGraphics(state);
};

const clearButtonFocus = (state: State) => {
	state.isFocused = false;
	const focused = focusedButtons.get(state.container.scene);
	if (focused === state) {
		focusedButtons.delete(state.container.scene);
	}
	renderButtonGraphics(state);
};

export const hasNavigableButtons = (scene: Phaser.Scene): boolean => getSceneButtons(scene).length > 0;

const normalizeButtonLabel = (label: string): string => label.trim().toLowerCase();

export const focusSceneButtonByText = (scene: Phaser.Scene, text: string): boolean => {
	const target = normalizeButtonLabel(text);
	const button = getSceneButtons(scene).find(
		(state) => normalizeButtonLabel(state.text.text) === target
	);

	if (!button) {
		return false;
	}

	setFocusedButton(button);
	return true;
};

export const hasSceneButtonByText = (scene: Phaser.Scene, text: string): boolean => {
	const target = normalizeButtonLabel(text);
	return getSceneButtons(scene).some((state) => normalizeButtonLabel(state.text.text) === target);
};

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

export const hasFocusedSceneButton = (scene: Phaser.Scene): boolean => {
	const focused = focusedButtons.get(scene);
	return !!focused && isButtonNavigable(focused, scene);
};

export const getFocusedSceneButtonText = (scene: Phaser.Scene): string | null => {
	const focused = focusedButtons.get(scene);
	if (!focused || !isButtonNavigable(focused, scene)) {
		return null;
	}

	return focused.text.text;
};

export const activateFocusedSceneButton = (scene: Phaser.Scene): boolean => {
	const focused = focusedButtons.get(scene);
	if (!focused || !isButtonNavigable(focused, scene)) {
		return false;
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
