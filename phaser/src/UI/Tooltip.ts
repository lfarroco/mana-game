/**
 * @file Implements a dynamic tooltip UI component for displaying information
 * with a title and description. The tooltip automatically adjusts its size
 * based on content and attempts to stay within the screen bounds.
 */

import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import { defaultTextConfig } from "../constants/constants";

const PADDING = 20;
const TITLE_FONT_SIZE = 40;
const DESCRIPTION_FONT_SIZE = 30;
const BORDER_RADIUS = 10;
const BACKGROUND_COLOR = 0x000000;
const BACKGROUND_ALPHA = 0.8;
const INTER_ELEMENT_PADDING = PADDING / 2;
const FIXED_TOOLTIP_WIDTH = 600;
const FIXED_TOOLTIP_HEIGHT = 300;

// Module-level state for the singleton tooltip
let scene: Phaser.Scene | null = null;
let container: Phaser.GameObjects.Container | null = null;
let bg: Phaser.GameObjects.Graphics | null = null;
let titleText: Phaser.GameObjects.Text | null = null;
let descriptionText: BBCodeText | null = null;
let currentTitle: string = '';
let currentDescription: string = '';

/**
 * Calculates the adjusted position for the tooltip to ensure it stays within the canvas bounds.
 * The tooltip is centered on the provided x, y coordinates unless it would go off-screen.
 * @param x The desired x-coordinate (center of the tooltip).
 * @param y The desired y-coordinate (center of the tooltip).
 * @param tooltipWidth The current width of the tooltip.
 * @param tooltipHeight The current height of the tooltip.
 * @returns An object containing the adjusted x and y coordinates.
 */
function getAdjustedPosition(x: number, y: number, tooltipWidth: number, tooltipHeight: number): { x: number, y: number } {
	if (!scene) return { x, y };

	const canvasWidth = scene.scale.width;
	const canvasHeight = scene.scale.height;
	const halfTooltipWidth = tooltipWidth / 2;
	const halfTooltipHeight = tooltipHeight / 2;

	let adjustedX = x;
	let adjustedY = y;

	if (adjustedX - halfTooltipWidth < 0) {
		adjustedX = halfTooltipWidth;
	} else if (adjustedX + halfTooltipWidth > canvasWidth) {
		adjustedX = canvasWidth - halfTooltipWidth;
	}

	if (adjustedY - halfTooltipHeight < 0) {
		adjustedY = halfTooltipHeight;
	} else if (adjustedY + halfTooltipHeight > canvasHeight) {
		adjustedY = canvasHeight - halfTooltipHeight;
	}

	return { x: adjustedX, y: adjustedY };
}

/**
 * Destroys the current tooltip and its associated game objects, removing them from the scene.
 * This prepares the module for re-initialization.
 */
export function destroyTooltip(): void {
	if (container) {
		container.destroy(true); // true to destroy children as well
	}
	scene = null;
	container = null;
	bg = null;
	titleText = null;
	descriptionText = null;
	currentTitle = '';
	currentDescription = '';
}

/**
 * Creates an instance of the Tooltip.
 * @param newScene The Phaser.Scene to which this tooltip will be added.
 */
export function initializeTooltip(newScene: Phaser.Scene): void {
	if (scene) {
		// If already initialized, destroy the old one first.
		destroyTooltip();
	}

	scene = newScene;

	container = scene.add.container(0, 0);
	container.setDepth(Phaser.Math.MAX_SAFE_INTEGER); // Ensure tooltip is on top

	bg = scene.add.graphics();
	bg.fillStyle(BACKGROUND_COLOR, BACKGROUND_ALPHA);
	bg.fillRoundedRect(
		-FIXED_TOOLTIP_WIDTH / 2,
		-FIXED_TOOLTIP_HEIGHT / 2,
		FIXED_TOOLTIP_WIDTH,
		FIXED_TOOLTIP_HEIGHT,
		BORDER_RADIUS
	);
	container.add(bg);

	titleText = scene.add.text(
		-FIXED_TOOLTIP_WIDTH / 2 + PADDING,
		-FIXED_TOOLTIP_HEIGHT / 2 + PADDING,
		'', // Initial empty text
		defaultTextConfig
	)
		.setOrigin(0)
		.setFontSize(TITLE_FONT_SIZE)
		.setFontFamily("Arial Black")
		.setAlign("left");
	container.add(titleText);

	const descriptionWrapWidth = FIXED_TOOLTIP_WIDTH - (2 * PADDING);
	descriptionText = scene.add.rexBBCodeText(
		-FIXED_TOOLTIP_WIDTH / 2 + PADDING,
		titleText.y + titleText.displayHeight + INTER_ELEMENT_PADDING, // Initial Y, will be updated
		'', // Initial empty text
	)
		.setOrigin(0)
		.setFontSize(DESCRIPTION_FONT_SIZE)
		.setAlign("left")
		.setWrapMode(1)
		.setFontFamily("Arial")
		.setWordWrapWidth(descriptionWrapWidth);
	container.add(descriptionText);

	container.setVisible(false); // Initially hidden
}

/**
 * Renders or updates the tooltip with new content and position.
 * @param x The target x-coordinate for the tooltip (center).
 * @param y The target y-coordinate for the tooltip (center).
 * @param title The title text to display.
 * @param description The description text to display.
 */
export function renderTooltip(x: number, y: number, title: string, description: string): void {
	if (!container || !titleText || !descriptionText || !scene) {
		console.warn("Tooltip not initialized. Call initializeTooltip(scene) first.");
		return;
	}

	let titleChanged = currentTitle !== title;
	let descriptionChanged = currentDescription !== description;
	let contentChanged = titleChanged || descriptionChanged;

	if (titleChanged) {
		titleText.setText(title);
		currentTitle = title;
	}

	if (descriptionChanged) {
		descriptionText.setText(description);
		currentDescription = description;
	}

	if (contentChanged || !container.visible) {
		// Background is fixed and drawn in constructor.
		// If background style could change, it would need to be redrawn here.

		// Position title text
		titleText.setPosition(
			-FIXED_TOOLTIP_WIDTH / 2,
			-FIXED_TOOLTIP_HEIGHT / 2 + PADDING
		);

		// Set description wrap width (it's fixed)
		const descriptionWrapWidth = FIXED_TOOLTIP_WIDTH - (2 * PADDING);
		if (descriptionText.style.wrapWidth !== descriptionWrapWidth) {
			descriptionText.setWordWrapWidth(descriptionWrapWidth);
		}

		// Position description text relative to title
		// Using .height for actual text height after potential wrapping and content update.
		descriptionText.setPosition(
			-FIXED_TOOLTIP_WIDTH / 2 + PADDING,
			titleText.y + titleText.height + INTER_ELEMENT_PADDING
		);
	}

	const { x: adjustedX, y: adjustedY } = getAdjustedPosition(x, y, FIXED_TOOLTIP_WIDTH, FIXED_TOOLTIP_HEIGHT);
	if (container.x !== adjustedX || container.y !== adjustedY) {
		container.setPosition(adjustedX, adjustedY);
	}
	if (!container.visible) {
		container.setVisible(true);
		scene.children.bringToTop(container)
	}
}

/**
 * Moves the tooltip to a new position if it's visible.
 * @param x The new target x-coordinate for the tooltip (center).
 * @param y The new target y-coordinate for the tooltip (center).
 */
export function moveTooltip(x: number, y: number): void {
	if (!container || !container.visible) return;
	const { x: adjustedX, y: adjustedY } = getAdjustedPosition(x, y, FIXED_TOOLTIP_WIDTH, FIXED_TOOLTIP_HEIGHT);
	if (container.x !== adjustedX || container.y !== adjustedY) {
		container.setPosition(adjustedX, adjustedY);
	}
}

/**
 * Hides the tooltip.
 */
export function hideTooltip(): void {
	if (container) {
		container.setVisible(false);
	}
}
