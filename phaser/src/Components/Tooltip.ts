import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import { titleTextConfig } from "@Constants/constants";
import { createLogger } from "@Utils/Logger";
import {
	TOOLTIP_HORIZONTAL_PADDING,
	TOOLTIP_INTER_ELEMENT_PADDING,
	TOOLTIP_MAX_WIDTH,
	TOOLTIP_MIN_HEIGHT,
	TOOLTIP_MIN_WIDTH,
	TOOLTIP_TOP_PADDING,
	getTooltipDimensions,
} from "@Components/TooltipLayout";
import {
	UI_TEXT_MUTED,
	UI_TOOLTIP_BG_COLOR,
	UI_TOOLTIP_BORDER_COLOR,
	UI_TOOLTIP_BORDER_THICKNESS,
	UI_TOOLTIP_FILL_ALPHA,
} from "@UI/theme";

const logger = createLogger("Tooltip");

const DESCRIPTION_FONT_SIZE = 30;
const DESCRIPTION_LINE_SPACING = 12;
const TOOLTIP_CORNER_RADIUS = 18;

let container: Phaser.GameObjects.Container | null = null;
let bg: Phaser.GameObjects.Graphics | null = null;
let titleText: Phaser.GameObjects.Text | null = null;
let descriptionText: BBCodeText | null = null;
let currentTitle: string = "";
let currentDescription: string = "";

let tooltipWidth: number = TOOLTIP_MIN_WIDTH;
let tooltipHeight: number = TOOLTIP_MIN_HEIGHT;
let lastAdjustedX: number | undefined;
let lastAdjustedY: number | undefined;

type TooltipRenderOptions = {
	anchorX?: "center" | "left";
	maxWidth?: number;
};

function getAdjustedPosition(
	x: number,
	y: number,
	options?: TooltipRenderOptions
): { x: number; y: number } {
	if (!container) return { x, y };

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

	const canvasWidth = io.scene.scale.width;
	const canvasHeight = io.scene.scale.height;
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
	tooltipWidth = TOOLTIP_MIN_WIDTH;
	tooltipHeight = TOOLTIP_MIN_HEIGHT;
	lastAdjustedX = undefined;
	lastAdjustedY = undefined;
}

export function init() {
	container = io.scene.add.container(0, 0);
	container.setDepth(Phaser.Math.MAX_SAFE_INTEGER);
	tooltipWidth = TOOLTIP_MIN_WIDTH;
	tooltipHeight = TOOLTIP_MIN_HEIGHT;

	bg = io.scene.add.graphics();
	drawTooltipBackground(tooltipWidth, tooltipHeight);

	container.add(bg);

	titleText = io.scene.add.text(0, 0, "", titleTextConfig).setAlign("left");
	container.add(titleText);

	descriptionText = io.scene.add
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
		const maxWidth = options?.maxWidth ?? TOOLTIP_MAX_WIDTH;
		const maxWrapWidth = maxWidth - 2 * TOOLTIP_HORIZONTAL_PADDING;
		const hasDescription = description.trim().length > 0;

		titleText.setWordWrapWidth(maxWrapWidth);
		descriptionText.setWordWrapWidth(maxWrapWidth);

		descriptionText.updateText();
		const initialDimensions = getTooltipDimensions({
			titleWidth: titleText.width,
			titleHeight: titleText.height,
			descriptionWidth: hasDescription ? descriptionText.width : 0,
			descriptionHeight: hasDescription ? descriptionText.height : 0,
			hasDescription,
			maxWidth,
		});

		tooltipWidth = initialDimensions.width;
		const actualContentWrapWidth = tooltipWidth - 2 * TOOLTIP_HORIZONTAL_PADDING;
		if (actualContentWrapWidth < maxWrapWidth) {
			titleText.setWordWrapWidth(actualContentWrapWidth);
			descriptionText.setWordWrapWidth(actualContentWrapWidth);
			descriptionText.updateText();
		}

		const finalDimensions = getTooltipDimensions({
			titleWidth: titleText.width,
			titleHeight: titleText.height,
			descriptionWidth: hasDescription ? descriptionText.width : 0,
			descriptionHeight: hasDescription ? descriptionText.height : 0,
			hasDescription,
			maxWidth,
		});

		tooltipWidth = finalDimensions.width;
		tooltipHeight = finalDimensions.height;

		if (!bg) return;
		drawTooltipBackground(tooltipWidth, tooltipHeight);

		titleText.setPosition(TOOLTIP_HORIZONTAL_PADDING, TOOLTIP_TOP_PADDING);
		descriptionText.setVisible(hasDescription);
		descriptionText.setPosition(
			TOOLTIP_HORIZONTAL_PADDING + 7,
			10 + TOOLTIP_TOP_PADDING + titleText.height + TOOLTIP_INTER_ELEMENT_PADDING
		);
		lastAdjustedX = undefined;
		lastAdjustedY = undefined;
	}

	const { x: adjustedX, y: adjustedY } = getAdjustedPosition(x, y, options);
	if (container.x !== adjustedX || container.y !== adjustedY) {
		container.setPosition(adjustedX, adjustedY);
	}

	if (!container.visible) {
		container.setVisible(true);
		io.scene.children.bringToTop(container);
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
