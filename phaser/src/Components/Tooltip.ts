import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import { titleTextConfig } from "@Constants/constants";
import { getCurrentScene } from "@Models/State";
import { createLogger } from "@Utils/Logger";
import {
	UI_TOOLTIP_ACCENT_COLOR,
	UI_TEXT_MUTED,
	UI_TOOLTIP_BG_COLOR,
	UI_TOOLTIP_BORDER_COLOR,
	UI_TOOLTIP_BORDER_THICKNESS,
	UI_TOOLTIP_FILL_ALPHA,
} from "@UI/theme";

const logger = createLogger("Tooltip");

const PADDING = 20;
const INTER_ELEMENT_PADDING = PADDING / 2;

const MIN_TOOLTIP_WIDTH = 800;
const MIN_TOOLTIP_HEIGHT = 330;
const MAX_TOOLTIP_WIDTH = 1040;

const DESCRIPTION_FONT_SIZE = 30;
const DESCRIPTION_LINE_SPACING = 12;
const TOOLTIP_CORNER_RADIUS = 18;
const TOOLTIP_INNER_BORDER_INSET = 6;

let container: Phaser.GameObjects.Container | null = null;
let bg: Phaser.GameObjects.Graphics | null = null;
let titleText: Phaser.GameObjects.Text | null = null;
let descriptionText: BBCodeText | null = null;
let currentTitle: string = "";
let currentDescription: string = "";

let tooltipWidth: number = MIN_TOOLTIP_WIDTH;
let tooltipHeight: number = MIN_TOOLTIP_HEIGHT;
let lastAdjustedX: number | undefined;
let lastAdjustedY: number | undefined;

type TooltipRenderOptions = {
	anchorX?: "center" | "left";
};

function getAdjustedPosition(
	x: number,
	y: number,
	options?: TooltipRenderOptions
): { x: number; y: number } {
	if (!container) return { x, y };

	const scene = getCurrentScene();
	const anchorX = options?.anchorX ?? "center";
	const halfTooltipWidth = tooltipWidth / 2;
	const halfTooltipHeight = tooltipHeight / 2;
	const desiredX = anchorX === "left" ? x : x - halfTooltipWidth;
	const desiredY = y - halfTooltipHeight;

	if (
		lastAdjustedX !== undefined &&
		lastAdjustedY !== undefined &&
		Math.abs(desiredX - lastAdjustedX) < 1 &&
		Math.abs(desiredY - lastAdjustedY) < 1
	) {
		return { x: lastAdjustedX, y: lastAdjustedY };
	}

	const canvasWidth = scene.scale.width;
	const canvasHeight = scene.scale.height;
	const adjustedX = Math.max(0, Math.min(desiredX, canvasWidth - tooltipWidth));
	const adjustedY = Math.max(0, Math.min(desiredY, canvasHeight - tooltipHeight));

	lastAdjustedX = adjustedX;
	lastAdjustedY = adjustedY;

	return { x: adjustedX, y: adjustedY };
}

function drawTooltipBackground(width: number, height: number): void {
	if (!bg) return;

	bg.clear();
	bg.fillStyle(UI_TOOLTIP_BG_COLOR, UI_TOOLTIP_FILL_ALPHA);
	bg.fillRoundedRect(0, 0, width, height, TOOLTIP_CORNER_RADIUS);

	bg.lineStyle(UI_TOOLTIP_BORDER_THICKNESS, UI_TOOLTIP_BORDER_COLOR, 0.92);
	bg.strokeRoundedRect(0, 0, width, height, TOOLTIP_CORNER_RADIUS);

	bg.lineStyle(2, UI_TOOLTIP_ACCENT_COLOR, 0.55);
	bg.strokeRoundedRect(
		TOOLTIP_INNER_BORDER_INSET,
		TOOLTIP_INNER_BORDER_INSET,
		width - TOOLTIP_INNER_BORDER_INSET * 2,
		height - TOOLTIP_INNER_BORDER_INSET * 2,
		Math.max(0, TOOLTIP_CORNER_RADIUS - TOOLTIP_INNER_BORDER_INSET / 2)
	);
}

export function destroyTooltip(): void {
	if (container) {
		container.destroy(true);
	}
	container = null;
	bg = null;
	titleText = null;
	descriptionText = null;
	currentTitle = "";
	currentDescription = "";
	tooltipWidth = MIN_TOOLTIP_WIDTH;
	tooltipHeight = MIN_TOOLTIP_HEIGHT;
	lastAdjustedX = undefined;
	lastAdjustedY = undefined;
}

export function init() {
	const scene = getCurrentScene();

	container = scene.add.container(0, 0);
	container.setDepth(Phaser.Math.MAX_SAFE_INTEGER);
	tooltipWidth = MIN_TOOLTIP_WIDTH;
	tooltipHeight = MIN_TOOLTIP_HEIGHT;

	bg = scene.add.graphics();
	drawTooltipBackground(tooltipWidth, tooltipHeight);

	container.add(bg);

	titleText = scene.add.text(0, 0, "", titleTextConfig).setAlign("left");
	container.add(titleText);

	descriptionText = scene.add
		.rexBBCodeText(0, 0, "", { color: UI_TEXT_MUTED })
		.setOrigin(0)
		.setFontSize(DESCRIPTION_FONT_SIZE)
		.setAlign("left")
		.setWrapMode(1)
		.setFontFamily("Arimo");

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const textAsAny = descriptionText as any;
	if (textAsAny.setLineSpacing) {
		textAsAny.setLineSpacing(DESCRIPTION_LINE_SPACING);
	} else if ("lineSpacing" in textAsAny) {
		textAsAny.lineSpacing = DESCRIPTION_LINE_SPACING;
	}
	container.add(descriptionText);

	container.setVisible(false);
}

export function renderTooltip(
	x: number,
	y: number,
	title: string,
	description: string,
	options?: TooltipRenderOptions
): void {
	if (!container || !titleText || !descriptionText || !bg) {
		logger.warn("Tooltip not initialized. Call initializeTooltip(scene) first.");
		return;
	}

	const titleChanged = currentTitle !== title;
	const descriptionChanged = currentDescription !== description;
	const contentChanged = titleChanged || descriptionChanged;

	if (titleChanged) {
		titleText.setText(title);
		currentTitle = title;
	}

	if (descriptionChanged) {
		descriptionText.setText(description);
		currentDescription = description;
	}

	if (contentChanged || !container.visible) {
		const maxWrapWidth = MAX_TOOLTIP_WIDTH - 2 * PADDING;
		descriptionText.setWordWrapWidth(maxWrapWidth);

		descriptionText.updateText();

		const contentWidth = Math.max(titleText.width, descriptionText.width);
		tooltipWidth = Math.max(
			MIN_TOOLTIP_WIDTH,
			Math.min(contentWidth + 2 * PADDING, MAX_TOOLTIP_WIDTH)
		);

		const actualDescriptionWrapWidth = tooltipWidth - 2 * PADDING;
		if (actualDescriptionWrapWidth < maxWrapWidth) {
			descriptionText.setWordWrapWidth(actualDescriptionWrapWidth);
			descriptionText.updateText();
		}

		const totalContentHeight = titleText.height + INTER_ELEMENT_PADDING + descriptionText.height;
		tooltipHeight = Math.max(MIN_TOOLTIP_HEIGHT, totalContentHeight + 2 * PADDING);

		if (!bg) return;
		drawTooltipBackground(tooltipWidth, tooltipHeight);

		titleText.setPosition(PADDING, PADDING);
		descriptionText.setPosition(
			PADDING + 7,
			10 + PADDING + titleText.height + INTER_ELEMENT_PADDING
		);
	}

	const { x: adjustedX, y: adjustedY } = getAdjustedPosition(x, y, options);
	if (container.x !== adjustedX || container.y !== adjustedY) {
		container.setPosition(adjustedX, adjustedY);
	}

	if (!container.visible) {
		container.setVisible(true);
		getCurrentScene().children.bringToTop(container);
	}
}

export function moveTooltip(x: number, y: number, options?: TooltipRenderOptions): void {
	if (!container || !container.visible) return;

	const { x: adjustedX, y: adjustedY } = getAdjustedPosition(x, y, options);
	if (container.x !== adjustedX || container.y !== adjustedY) {
		container.setPosition(adjustedX, adjustedY);
	}
}

export function hideTooltip() {
	if (container) {
		container.setVisible(false);
	}
}
