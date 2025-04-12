import { defaultTextConfig } from "../Scenes/Battleground/constants";

// TODO: on mobile, use a long press to show the tooltip

let scene: Phaser.Scene;

let tooltip: Phaser.GameObjects.Container;

const TOOLTIP_WIDTH = 500;
const TOOLTIP_HEIGHT = 300;

export function init(sceneRef: Phaser.Scene) {
	scene = sceneRef;
}

export function render(x: number, y: number, text: string) {
	if (!tooltip) tooltip = scene.add.container(0, 0);
	tooltip.removeAll(true);
	scene.children.bringToTop(tooltip);

	const { x: adjustedX, y: adjustedY } = getAdjustedPosition(x, y);

	tooltip.setPosition(adjustedX, adjustedY);
	const tooltipBg = scene.add.graphics();
	tooltipBg.fillStyle(0x000000, 0.8);
	tooltipBg.fillRoundedRect(-TOOLTIP_WIDTH / 2, -TOOLTIP_HEIGHT / 2, TOOLTIP_WIDTH, TOOLTIP_HEIGHT, 10);

	const tooltipText = scene.add.text(
		-TOOLTIP_WIDTH / 2 + 20, - TOOLTIP_HEIGHT / 2 + 20,
		text, defaultTextConfig)
		.setOrigin(0)
		.setFontSize(30)
		.setAlign("left");

	tooltip.add([tooltipBg, tooltipText]);
}

/**
 * Adjusts coordinates to keep the tooltip within canvas bounds
 */
function getAdjustedPosition(x: number, y: number): { x: number, y: number } {
	// Get the canvas dimensions
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
	if (!tooltip) return;

	// Get adjusted position
	const { x: adjustedX, y: adjustedY } = getAdjustedPosition(x, y);

	// Update the position of each child in the tooltip
	tooltip.setPosition(adjustedX, adjustedY);
}

// hide tooltip
export function hide() {
	if (!tooltip) return;
	tooltip.removeAll(true);
}