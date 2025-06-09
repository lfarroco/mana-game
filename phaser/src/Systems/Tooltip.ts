import { defaultTextConfig } from "../Scenes/Battleground/constants";

// TODO: on mobile, use a long press to show the tooltip

let scene: Phaser.Scene;
let tooltipContainer: Phaser.GameObjects.Container | undefined;
let tooltipBg: Phaser.GameObjects.Graphics | undefined;
let titleTextObj: Phaser.GameObjects.Text | undefined;
let descriptionTextObj: Phaser.GameObjects.Text | undefined;

const TOOLTIP_WIDTH = 500;
const TOOLTIP_HEIGHT = 300;
const PADDING = 20;
const TITLE_FONT_SIZE = 40;
const DESCRIPTION_FONT_SIZE = 30;
const BORDER_RADIUS = 10;
const BACKGROUND_COLOR = 0x000000;
const BACKGROUND_ALPHA = 0.8;
const INTER_ELEMENT_PADDING = PADDING / 2;

export function init(sceneRef: Phaser.Scene) {
	scene = sceneRef;
}

function _createTooltipElements() {
	if (!scene) {
		console.error("Tooltip system not initialized. Call init(scene) first.");
		return;
	}
	tooltipContainer = scene.add.container(0, 0);
	tooltipContainer.setDepth(Phaser.Math.MAX_SAFE_INTEGER); // Ensure tooltip is on top

	tooltipBg = scene.add.graphics();
	tooltipBg.fillStyle(BACKGROUND_COLOR, BACKGROUND_ALPHA);
	tooltipBg.fillRoundedRect(
		-TOOLTIP_WIDTH / 2,
		-TOOLTIP_HEIGHT / 2,
		TOOLTIP_WIDTH,
		TOOLTIP_HEIGHT,
		BORDER_RADIUS
	);
	tooltipContainer.add(tooltipBg);

	titleTextObj = scene.add.text(
		-TOOLTIP_WIDTH / 2 + PADDING,
		-TOOLTIP_HEIGHT / 2 + PADDING,
		'', // Initial empty text
		defaultTextConfig
	)
		.setOrigin(0)
		.setFontSize(TITLE_FONT_SIZE)
		.setFontFamily("Arial Black")
		.setAlign("left");
	tooltipContainer.add(titleTextObj);

	descriptionTextObj = scene.add.text(
		-TOOLTIP_WIDTH / 2 + PADDING,
		// Positioned dynamically in render based on titleTextObj's height
		-TOOLTIP_HEIGHT / 2 + PADDING + TITLE_FONT_SIZE + INTER_ELEMENT_PADDING,
		'', // Initial empty text
		defaultTextConfig
	)
		.setOrigin(0)
		.setFontSize(DESCRIPTION_FONT_SIZE)
		.setAlign("left")
		.setWordWrapWidth(TOOLTIP_WIDTH - (2 * PADDING));
	tooltipContainer.add(descriptionTextObj);

	tooltipContainer.setVisible(false); // Initially hidden
}

export function render(
	x: number,
	y: number,
	title: string,
	description: string,
) {
	if (!tooltipContainer) {
		_createTooltipElements();
	}

	if (!tooltipContainer || !titleTextObj || !descriptionTextObj || !tooltipBg) {
		// Elements failed to initialize
		return;
	}

	titleTextObj.setText(title);
	descriptionTextObj.setText(description);

	// Dynamically position description below title
	descriptionTextObj.setY(titleTextObj.y + titleTextObj.displayHeight + INTER_ELEMENT_PADDING);

	// Note: If TOOLTIP_HEIGHT needs to be dynamic based on content,
	// tooltipBg and potentially getAdjustedPosition would need updates here.
	// For now, assuming fixed TOOLTIP_HEIGHT.

	const { x: adjustedX, y: adjustedY } = getAdjustedPosition(x, y);
	tooltipContainer.setPosition(adjustedX, adjustedY);
	tooltipContainer.setVisible(true);
}

/**
 * Adjusts coordinates to keep the tooltip within canvas bounds
 */
function getAdjustedPosition(x: number, y: number): { x: number, y: number } {
	const canvasWidth = scene.scale.width;
	const canvasHeight = scene.scale.height;

	// Half the width/height because we're using origin 0.5
	const halfTooltipWidth = TOOLTIP_WIDTH / 2;
	const halfTooltipHeight = TOOLTIP_HEIGHT / 2;

	let adjustedX = x;
	let adjustedY = y;

	// Adjust X if tooltip would overflow left or right
	if (adjustedX - halfTooltipWidth < 0) {
		adjustedX = halfTooltipWidth;
	} else if (adjustedX + halfTooltipWidth > canvasWidth) {
		adjustedX = canvasWidth - halfTooltipWidth;
	}

	// Adjust Y if tooltip would overflow top or bottom
	if (adjustedY - halfTooltipHeight < 0) {
		adjustedY = halfTooltipHeight;
	} else if (adjustedY + halfTooltipHeight > canvasHeight) {
		adjustedY = canvasHeight - halfTooltipHeight;
	}

	return { x: adjustedX, y: adjustedY };
}

/**
 * Moves the existing tooltip to a new position
 */
export function move(x: number, y: number) {
	if (!tooltipContainer || !tooltipContainer.visible) return;

	const { x: adjustedX, y: adjustedY } = getAdjustedPosition(x, y);
	tooltipContainer.setPosition(adjustedX, adjustedY);
}

// hide tooltip
export function hide() {
	if (!tooltipContainer) return;
	tooltipContainer.setVisible(false);
}