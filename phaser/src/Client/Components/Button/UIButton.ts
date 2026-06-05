import * as constants from "@Constants";
import * as AudioManager from "@Systems/AudioManager";
import * as ButtonTooltip from "@Components/Button/ButtonTooltip";
import * as Logger from "@Utils/Logger";
import * as theme from "@Screens/Battleground/Components/UI/theme";

const logger = Logger.createLogger("UIButton");

// UI button styling constants
const BUTTON_HEIGHT = 60;
const BUTTON_BG_COLOR = theme.UI_SURFACE_COLOR;
const BUTTON_CORNER_RADIUS = 10;
const BUTTON_TEXT_FONT_SIZE = "24px";
const BUTTON_BORDER_WIDTH = 2;
const BUTTON_ACTIVE_BORDER_WIDTH = theme.UI_SURFACE_ACTIVE_BORDER_WIDTH;
const BUTTON_BORDER_COLOR = theme.UI_SURFACE_BORDER_COLOR;
const BUTTON_BORDER_ALPHA = 0.7;
const BUTTON_HOVER_BORDER_COLOR = theme.UI_SURFACE_HOVER_BORDER_COLOR;
const BUTTON_HOVER_BORDER_ALPHA = 1;
const BUTTON_BG_ALPHA = 0.42;
const BUTTON_HOVER_BG_ALPHA = 0.52;
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
const BUTTON_CURSOR = "pointer";
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
	press: () => void;
	container: Container;
	text: Phaser.GameObjects.Text;
};

export type CreateUIButtonConfig = {
	text: string;
	position: Vec2;
	callback: () => void;
	width?: number;
	emoji?: string;
	tooltip?: ButtonTooltip.ButtonTooltipContent;
};

type State = {
	id: string;
	label: string;
	size: Size;
	isPressed: boolean;
	isHovered: boolean;
	currentBackgroundAlpha: number;
	container: Container;
	graphics: Phaser.GameObjects.Graphics;
	text: Phaser.GameObjects.Text;
	callback: () => void;
	tooltip?: ReturnType<typeof ButtonTooltip.attachButtonTooltip>;
};

const buttonsIndex = new WeakMap<Container, State>();
const registeredButtons = new Set<State>();

const textStyle = {
	...constants.titleTextConfig,
	fontSize: BUTTON_TEXT_FONT_SIZE,
	color: theme.UI_TEXT_PRIMARY,
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
		const glowWidth = Math.max(theme.UI_TOOLTIP_BORDER_THICKNESS + 1, visuals.borderWidth + 2);
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
		theme.UI_SURFACE_ACCENT_COLOR,
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

export function create({
	text,
	position,
	callback,
	width = 280,
	emoji,
	tooltip,
}: CreateUIButtonConfig): Button {
	logger.debug(`DEBUG: createUIButton called for ${text}`);
	const size = {
		width,
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
	if (buttonGraphics.input) {
		buttonGraphics.input.cursor = BUTTON_CURSOR;
	}

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
		AudioManager.playSoundEffect("sfx_unit_onclick");
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

		buttonsIndex.delete(container);
		unregisterButton(text);
	});

	const state: State = {
		id: `button-${buttonInstanceCounter++}`,
		label: text,
		size,
		isPressed: false,
		isHovered: false,
		currentBackgroundAlpha: BUTTON_BG_ALPHA,
		container,
		graphics: buttonGraphics,
		text: buttonText,
		callback,
		tooltip:
			tooltip && tooltip.description.trim().length > 0
				? ButtonTooltip.attachButtonTooltip(
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

	renderButtonGraphics(state, getButtonVisualStyle(state));
}

export function enableUIButton(state: State) {
	io.SetAlpha(state.graphics, 1);

	io.SetInteractiveRect(state.size)(state.graphics);
	if (state.graphics.input) {
		state.graphics.input.cursor = BUTTON_CURSOR;
	}

	renderButtonGraphics(state, getButtonVisualStyle(state));
}
