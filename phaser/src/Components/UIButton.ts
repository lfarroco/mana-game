import Phaser from "phaser";
import { titleTextConfig } from "@Constants/constants";
import { playSoundEffect } from "@Systems/AudioManager";
import * as io from "@PhaserIO";
import { attachButtonTooltip, ButtonTooltipContent } from "@Components/ButtonTooltip";
import { createLogger } from "@Utils/Logger";
import { findNextFocusable, FocusableEntry } from "@Systems/Controls/navigation";
import { NavigationDirection } from "@Systems/Controls/intents";
import {
	UI_SURFACE_ACTIVE_BORDER_WIDTH,
	UI_SURFACE_ACCENT_COLOR,
	UI_SURFACE_BORDER_COLOR,
	UI_SURFACE_COLOR,
	UI_SURFACE_HOVER_BORDER_COLOR,
	UI_TEXT_PRIMARY,
	UI_TOOLTIP_BORDER_THICKNESS,
} from "@UI/theme";

const logger = createLogger("UIButton");

// UI button styling constants
const BUTTON_HEIGHT = 60;
const BUTTON_BG_COLOR = UI_SURFACE_COLOR;
const BUTTON_CORNER_RADIUS = 10;
const BUTTON_TEXT_FONT_SIZE = "24px";
const BUTTON_BORDER_WIDTH = 2;
const BUTTON_ACTIVE_BORDER_WIDTH = UI_SURFACE_ACTIVE_BORDER_WIDTH;
const BUTTON_BORDER_COLOR = UI_SURFACE_BORDER_COLOR;
const BUTTON_BORDER_ALPHA = 0.7;
const BUTTON_HOVER_BORDER_COLOR = UI_SURFACE_HOVER_BORDER_COLOR;
const BUTTON_HOVER_BORDER_ALPHA = 1;
const BUTTON_FOCUS_BORDER_COLOR = UI_SURFACE_BORDER_COLOR;
const BUTTON_FOCUS_BORDER_ALPHA = 1;
const BUTTON_BG_ALPHA = 0.42;
const BUTTON_HOVER_BG_ALPHA = 0.52;
const BUTTON_FOCUS_BG_ALPHA = 0.5;
const BUTTON_PRESSED_BG_ALPHA = 0.62;
const BUTTON_DISABLED_BG_ALPHA = 0.18;
const BUTTON_DISABLED_BORDER_ALPHA = 0.3;
const BUTTON_HOVER_TRANSITION_DURATION_MS = 140;
const BUTTON_TOOLTIP_BOTTOM_OFFSET = 180;
const BUTTON_TOOLTIP_RIGHT_OFFSET = 80;
const BUTTON_TOP_HIGHLIGHT_HEIGHT = 24;
const BUTTON_TOP_HIGHLIGHT_ALPHA = 0.14;
const BUTTON_INNER_BORDER_WIDTH = 2;
const BUTTON_INNER_BORDER_INSET = 6;
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
	label: string;
	size: Size;
	isPressed: boolean;
	isHovered: boolean;
	isFocused: boolean;
	currentBackgroundAlpha: number;
	container: Container;
	graphics: Phaser.GameObjects.Graphics;
	text: Phaser.GameObjects.Text;
	callback: () => void;
	tooltip?: ReturnType<typeof attachButtonTooltip>;
};

const buttonsIndex = new WeakMap<Container, State>();
const registeredButtons = new Set<State>();
const focusedButtons = new WeakMap<Phaser.Scene, State>();

const textStyle = {
	...titleTextConfig,
	fontSize: BUTTON_TEXT_FONT_SIZE,
	color: UI_TEXT_PRIMARY,
	stroke: "#000000",
	fontStyle: "bold",
	strokeThickness: 2,
};

const buildButtonDisplayText = (label: string, emoji?: string): string =>
	emoji ? `${emoji} ${label}` : label;

type ButtonVisualStyle = {
	backgroundAlpha: number;
	borderColor: number;
	borderAlpha: number;
	borderWidth: number;
	glowAlpha: number;
	textAlpha: number;
};

const getButtonVisualStyle = (state: State): ButtonVisualStyle => {
	if (!state.graphics.input?.enabled) {
		return {
			backgroundAlpha: BUTTON_DISABLED_BG_ALPHA,
			borderColor: BUTTON_BORDER_COLOR,
			borderAlpha: BUTTON_DISABLED_BORDER_ALPHA,
			borderWidth: BUTTON_BORDER_WIDTH,
			glowAlpha: 0,
			textAlpha: 0.65,
		};
	}

	if (state.isPressed) {
		return {
			backgroundAlpha: BUTTON_PRESSED_BG_ALPHA,
			borderColor: BUTTON_HOVER_BORDER_COLOR,
			borderAlpha: BUTTON_HOVER_BORDER_ALPHA,
			borderWidth: BUTTON_ACTIVE_BORDER_WIDTH,
			glowAlpha: 0.28,
			textAlpha: 1,
		};
	}

	if (state.isHovered) {
		return {
			backgroundAlpha: BUTTON_HOVER_BG_ALPHA,
			borderColor: BUTTON_HOVER_BORDER_COLOR,
			borderAlpha: BUTTON_HOVER_BORDER_ALPHA,
			borderWidth: BUTTON_ACTIVE_BORDER_WIDTH,
			glowAlpha: 0.22,
			textAlpha: 1,
		};
	}

	if (state.isFocused) {
		return {
			backgroundAlpha: BUTTON_FOCUS_BG_ALPHA,
			borderColor: BUTTON_FOCUS_BORDER_COLOR,
			borderAlpha: BUTTON_FOCUS_BORDER_ALPHA,
			borderWidth: BUTTON_ACTIVE_BORDER_WIDTH,
			glowAlpha: 0.32,
			textAlpha: 1,
		};
	}

	return {
		backgroundAlpha: BUTTON_BG_ALPHA,
		borderColor: BUTTON_BORDER_COLOR,
		borderAlpha: BUTTON_BORDER_ALPHA,
		borderWidth: BUTTON_BORDER_WIDTH,
		glowAlpha: 0,
		textAlpha: 1,
	};
};

const renderButtonGraphics = (state: State, visuals: ButtonVisualStyle) => {
	state.graphics.clear();
	if (visuals.glowAlpha > 0) {
		const glowWidth = Math.max(UI_TOOLTIP_BORDER_THICKNESS + 1, visuals.borderWidth + 2);
		state.graphics.lineStyle(glowWidth, visuals.borderColor, visuals.glowAlpha * 0.28);
		state.graphics.strokeRoundedRect(
			-glowWidth / 2,
			-glowWidth / 2,
			state.size.width + glowWidth,
			state.size.height + glowWidth,
			BUTTON_CORNER_RADIUS + glowWidth / 2
		);
		state.graphics.lineStyle(glowWidth - 2, visuals.borderColor, visuals.glowAlpha * 0.16);
		state.graphics.strokeRoundedRect(
			-glowWidth,
			-glowWidth,
			state.size.width + glowWidth * 2,
			state.size.height + glowWidth * 2,
			BUTTON_CORNER_RADIUS + glowWidth
		);
	}
	state.graphics.lineStyle(visuals.borderWidth, visuals.borderColor, visuals.borderAlpha);
	state.graphics.fillStyle(BUTTON_BG_COLOR, state.currentBackgroundAlpha);
	state.graphics.fillRoundedRect(0, 0, state.size.width, state.size.height, BUTTON_CORNER_RADIUS);
	state.graphics.fillStyle(
		visuals.borderColor,
		Math.min(BUTTON_TOP_HIGHLIGHT_ALPHA, visuals.borderAlpha * BUTTON_TOP_HIGHLIGHT_ALPHA)
	);
	state.graphics.fillRoundedRect(
		0,
		0,
		state.size.width,
		Math.min(BUTTON_TOP_HIGHLIGHT_HEIGHT, state.size.height),
		BUTTON_CORNER_RADIUS
	);
	state.graphics.strokeRoundedRect(0, 0, state.size.width, state.size.height, BUTTON_CORNER_RADIUS);
	state.graphics.lineStyle(
		BUTTON_INNER_BORDER_WIDTH,
		UI_SURFACE_ACCENT_COLOR,
		Math.max(0.18, visuals.borderAlpha * 0.6)
	);
	state.graphics.strokeRoundedRect(
		BUTTON_INNER_BORDER_INSET,
		BUTTON_INNER_BORDER_INSET,
		state.size.width - BUTTON_INNER_BORDER_INSET * 2,
		state.size.height - BUTTON_INNER_BORDER_INSET * 2,
		Math.max(0, BUTTON_CORNER_RADIUS - BUTTON_INNER_BORDER_INSET / 2)
	);
	if (visuals.glowAlpha > 0) {
		state.graphics.lineStyle(2, visuals.borderColor, Math.min(1, visuals.glowAlpha * 0.5));
		state.graphics.strokeRoundedRect(
			BUTTON_INNER_BORDER_INSET,
			BUTTON_INNER_BORDER_INSET,
			state.size.width - BUTTON_INNER_BORDER_INSET * 2,
			state.size.height - BUTTON_INNER_BORDER_INSET * 2,
			Math.max(0, BUTTON_CORNER_RADIUS - BUTTON_INNER_BORDER_INSET / 2)
		);
	}
	state.text.setScale(1);
	state.text.setAlpha(visuals.textAlpha);
};

export function createUIButton(
	text: string,
	position: Vec2,
	callback: () => void,
	width?: number,
	emoji?: string,
	tooltip?: ButtonTooltipContent
): Button {
	logger.debug(`DEBUG: createUIButton called for ${text}`);
	const size = {
		width: width || 280,
		height: BUTTON_HEIGHT,
	};
	const container = io.Container();
	const displayText = buildButtonDisplayText(text, emoji);

	const buttonGraphics = io.BorderedRoundRect(
		position,
		size,
		BUTTON_CORNER_RADIUS,
		BUTTON_BG_COLOR,
		1
	);

	io.SetInteractiveRect(size)(buttonGraphics);

	const buttonText = io.Text(displayText, textStyle);
	io.SetPosition(buttonText, position);
	io.Centralize(buttonText);

	io.AddChildren(container, [buttonGraphics, buttonText]);

	const syncVisualState = () => {
		const scene = state.container.scene;
		if (!scene) {
			return;
		}

		const visuals = getButtonVisualStyle(state);
		scene.tweens.killTweensOf(state);
		io.Tween({
			targets: state,
			currentBackgroundAlpha: visuals.backgroundAlpha,
			duration: BUTTON_HOVER_TRANSITION_DURATION_MS,
			ease: "Sine.easeOut",
			onUpdate: () => renderButtonGraphics(state, visuals),
			onComplete: () => renderButtonGraphics(state, getButtonVisualStyle(state)),
		});
		renderButtonGraphics(state, visuals);
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
		const scene = container.scene;
		scene?.tweens.killTweensOf(state);
		state.tooltip?.destroy();
		registeredButtons.delete(state);
		const focusedButton = scene ? focusedButtons.get(scene) : undefined;
		if (focusedButton === state) {
			focusedButtons.delete(scene);
		}
		buttonsIndex.delete(container);
		unregisterButton(text);
	});

	const state: State = {
		id: `button-${buttonInstanceCounter++}`,
		label: text,
		size,
		isPressed: false,
		isHovered: false,
		isFocused: false,
		currentBackgroundAlpha: BUTTON_BG_ALPHA,
		container,
		graphics: buttonGraphics,
		text: buttonText,
		callback,
		tooltip:
			tooltip && tooltip.description.trim().length > 0
				? attachButtonTooltip(
						buttonGraphics,
						tooltip,
						() => !!buttonGraphics.input?.enabled,
						() => ({
							x:
								tooltip.position === "right"
									? position.x + size.width / 2 + BUTTON_TOOLTIP_RIGHT_OFFSET
									: position.x,
							y:
								tooltip.position === "right"
									? position.y
									: position.y + size.height / 2 + BUTTON_TOOLTIP_BOTTOM_OFFSET,
						})
					)
				: undefined,
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
	state.tooltip?.hide();
	io.SetAlpha(state.graphics, 0.5);

	io.DisableInteractive(state.graphics);

	state.isPressed = false;
	state.isHovered = false;
	if (state.isFocused) {
		clearButtonFocus(state);
	}
	renderButtonGraphics(state, getButtonVisualStyle(state));
}

export function enableUIButton(state: State) {
	io.SetAlpha(state.graphics, 1);

	io.SetInteractiveRect(state.size)(state.graphics);

	renderButtonGraphics(state, getButtonVisualStyle(state));
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
		renderButtonGraphics(previous, getButtonVisualStyle(previous));
	}

	state.isFocused = true;
	focusedButtons.set(scene, state);
	renderButtonGraphics(state, getButtonVisualStyle(state));
};

const clearButtonFocus = (state: State) => {
	state.isFocused = false;
	const focused = focusedButtons.get(state.container.scene);
	if (focused === state) {
		focusedButtons.delete(state.container.scene);
	}
	renderButtonGraphics(state, getButtonVisualStyle(state));
};

export const hasNavigableButtons = (scene: Phaser.Scene): boolean => getSceneButtons(scene).length > 0;

const normalizeButtonLabel = (label: string): string => label.trim().toLowerCase();

export const focusSceneButtonByText = (scene: Phaser.Scene, text: string): boolean => {
	const target = normalizeButtonLabel(text);
	const button = getSceneButtons(scene).find(
		(state) => normalizeButtonLabel(state.label) === target
	);

	if (!button) {
		return false;
	}

	setFocusedButton(button);
	return true;
};

export const hasSceneButtonByText = (scene: Phaser.Scene, text: string): boolean => {
	const target = normalizeButtonLabel(text);
	return getSceneButtons(scene).some((state) => normalizeButtonLabel(state.label) === target);
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

	return focused.label;
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
