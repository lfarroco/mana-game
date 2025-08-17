/**
 * @file Implements a dynamic tooltip UI component for displaying information
 * with a title and description. The tooltip automatically adjusts its size
 * based on content and attempts to stay within the screen bounds.
 */

import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import { defaultTextConfig } from "../constants/constants";
import { tooltipFragmentShader } from "../Shaders/TooltipShader";

// UI Constants
const PADDING = 30;
const INTER_ELEMENT_PADDING = PADDING / 2;

// Sizing Constants
const MIN_TOOLTIP_WIDTH = 600;
const MIN_TOOLTIP_HEIGHT = 300;
const MAX_TOOLTIP_WIDTH = 800;

// Font Constants
const TITLE_FONT_SIZE = 40;
const DESCRIPTION_FONT_SIZE = 30;
const DESCRIPTION_LINE_SPACING = 8; // extra vertical space between lines

// Module-level state for the singleton tooltip
let scene: Phaser.Scene | null = null;
let container: Phaser.GameObjects.Container | null = null;
let bg: Phaser.GameObjects.Shader | null = null;
let titleText: Phaser.GameObjects.Text | null = null;
let descriptionText: BBCodeText | null = null;
let currentTitle: string = '';
let currentDescription: string = '';
let startTime: number = 0;

// Tooltip dimensions
let tooltipWidth: number = MIN_TOOLTIP_WIDTH;
let tooltipHeight: number = MIN_TOOLTIP_HEIGHT;
let lastAdjustedX: number | undefined;
let lastAdjustedY: number | undefined;

/**
 * Calculates the adjusted position for the tooltip to ensure it stays within the canvas bounds.
 * The tooltip will be centered on the provided x, y coordinates unless it would go off-screen.
 * Returns the top-left corner position for 0,0 anchored tooltip.
 * @param x The desired x-coordinate (center of the tooltip).
 * @param y The desired y-coordinate (center of the tooltip).
 * @returns An object containing the adjusted x and y coordinates for the top-left corner.
 */
function getAdjustedPosition(x: number, y: number): { x: number, y: number } {
	if (!scene || !container) return { x, y };

	// Check if we can use cached position
	if (lastAdjustedX !== undefined &&
		lastAdjustedY !== undefined &&
		Math.abs(x - (container.x + tooltipWidth / 2)) < 1 &&
		Math.abs(y - (container.y + tooltipHeight / 2)) < 1) {
		return { x: lastAdjustedX, y: lastAdjustedY };
	}

	const canvasWidth = scene.scale.width;
	const canvasHeight = scene.scale.height;
	const halfTooltipWidth = tooltipWidth / 2;
	const halfTooltipHeight = tooltipHeight / 2;

	// Calculate center position first
	const centerX = Math.max(halfTooltipWidth, Math.min(x, canvasWidth - halfTooltipWidth));
	const centerY = Math.max(halfTooltipHeight, Math.min(y, canvasHeight - halfTooltipHeight));

	// Convert center position to top-left corner for 0,0 anchor
	const adjustedX = centerX - halfTooltipWidth;
	const adjustedY = centerY - halfTooltipHeight;

	// Cache the result
	lastAdjustedX = adjustedX;
	lastAdjustedY = adjustedY;

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
	tooltipWidth = MIN_TOOLTIP_WIDTH;
	tooltipHeight = MIN_TOOLTIP_HEIGHT;
	lastAdjustedX = undefined;
	lastAdjustedY = undefined;
	startTime = 0;
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
	startTime = scene.time.now;

	container = scene.add.container(0, 0);
	container.setDepth(Phaser.Math.MAX_SAFE_INTEGER); // Ensure tooltip is on top
	tooltipWidth = MIN_TOOLTIP_WIDTH;
	tooltipHeight = MIN_TOOLTIP_HEIGHT;

	// Create the shader for the background
	const bgColorVec3 = { x: 0.1, y: 0.21, z: 0.21 }; // Dark teal (converted from 0x1a3635)
	const borderColorVec3 = { x: 0.78, y: 0.64, z: 0.33 }; // Golden (converted from 0xc8a355)

	const baseShader = new Phaser.Display.BaseShader(
		'TooltipShader',
		tooltipFragmentShader,
		undefined,
		{
			time: { type: '1f', value: 0.0 },
			resolution: { type: '2f', value: [tooltipWidth, tooltipHeight] },
			bgColor: { type: '3f', value: bgColorVec3 },
			borderColor: { type: '3f', value: borderColorVec3 }
		}
	);

	bg = scene.add.shader(
		baseShader,
		0,
		0,
		tooltipWidth,
		tooltipHeight
	).setOrigin(0, 0);

	container.add(bg);

	const textConfig = { ...defaultTextConfig };
	delete (textConfig as any).backgroundColor; // Remove any background color

	titleText = scene.add.text(0, 0, '', textConfig)
		.setOrigin(0)
		.setFontSize(TITLE_FONT_SIZE)
		.setFontFamily("Arial Black")
		.setAlign("left");
	container.add(titleText);

	descriptionText = scene.add.rexBBCodeText(0, 0, '')
		.setOrigin(0)
		.setFontSize(DESCRIPTION_FONT_SIZE)
		.setAlign("left")
		.setWrapMode(1)
		.setFontFamily("Arial");

	// Increase line height (line spacing) slightly for readability
	// Use cast to any in case typings don't include setLineSpacing
	if ((descriptionText as any).setLineSpacing) {
		(descriptionText as any).setLineSpacing(DESCRIPTION_LINE_SPACING);
	} else if ('lineSpacing' in (descriptionText as any)) {
		(descriptionText as any).lineSpacing = DESCRIPTION_LINE_SPACING;
	}
	container.add(descriptionText);

	container.setVisible(false); // Initially hidden
}

/**
 * Updates the shader animation if the tooltip is visible.
 */
function updateShaderAnimation(): void {
	if (!bg || !scene || !container?.visible) return;

	const elapsedTime = (scene.time.now - startTime) / 1000;
	bg.setUniform('time.value', elapsedTime);
}

/**
 * Renders or updates the tooltip with new content and position.
 * @param x The target x-coordinate for the tooltip (center).
 * @param y The target y-coordinate for the tooltip (center).
 * @param title The title text to display.
 * @param description The description text to display.
 */
export function renderTooltip(x: number, y: number, title: string, description: string): void {
	if (!container || !titleText || !descriptionText || !scene || !bg) {
		console.warn("Tooltip not initialized. Call initializeTooltip(scene) first.");
		return;
	}

	const titleChanged = currentTitle !== title;
	const descriptionChanged = currentDescription !== description;
	const contentChanged = titleChanged || descriptionChanged;

	// Update text content if changed
	if (titleChanged) {
		titleText.setText(title);
		currentTitle = title;
	}

	if (descriptionChanged) {
		descriptionText.setText(description);
		currentDescription = description;
	}

	// Recalculate layout only if content changed or tooltip was hidden
	if (contentChanged || !container.visible) {
		// First, render text with maximum possible width to get accurate measurements
		const maxWrapWidth = MAX_TOOLTIP_WIDTH - 2 * PADDING;
		descriptionText.setWordWrapWidth(maxWrapWidth);

		// Force text layout update for BBCodeText to get accurate dimensions
		descriptionText.updateText();

		// Now calculate the actual tooltip size based on text content
		const contentWidth = Math.max(titleText.width, descriptionText.width);
		tooltipWidth = Math.max(MIN_TOOLTIP_WIDTH, Math.min(contentWidth + 2 * PADDING, MAX_TOOLTIP_WIDTH));

		// If the calculated width is smaller than max, re-wrap description with the actual width
		const actualDescriptionWrapWidth = tooltipWidth - 2 * PADDING;
		if (actualDescriptionWrapWidth < maxWrapWidth) {
			descriptionText.setWordWrapWidth(actualDescriptionWrapWidth);
			descriptionText.updateText();
		}

		// Calculate total height based on final text dimensions
		const totalContentHeight = titleText.height + INTER_ELEMENT_PADDING + descriptionText.height;
		tooltipHeight = Math.max(MIN_TOOLTIP_HEIGHT, totalContentHeight + 2 * PADDING);

		// Update shader background size first
		if (!bg) return;
		bg.setSize(tooltipWidth, tooltipHeight);
		bg.setUniform('resolution.value', [tooltipWidth, tooltipHeight]);

		// Update time uniform for animation
		const elapsedTime = (scene.time.now - startTime) / 1000;
		bg.setUniform('time.value', elapsedTime);

		// Position text elements with consistent 0,0 anchor positioning
		titleText.setPosition(PADDING, PADDING);
		descriptionText.setPosition(PADDING, PADDING + titleText.height + INTER_ELEMENT_PADDING);
	}

	// Update position
	const { x: adjustedX, y: adjustedY } = getAdjustedPosition(x, y);
	if (container.x !== adjustedX || container.y !== adjustedY) {
		container.setPosition(adjustedX, adjustedY);
	}

	if (!container.visible) {
		container.setVisible(true);
		scene.children.bringToTop(container);
	}

	// Update shader animation
	updateShaderAnimation();
}

/**
 * Moves the tooltip to a new position if it's visible.
 * @param x The new target x-coordinate for the tooltip (center).
 * @param y The new target y-coordinate for the tooltip (center).
 */
export function moveTooltip(x: number, y: number): void {
	if (!container || !container.visible) return;

	const { x: adjustedX, y: adjustedY } = getAdjustedPosition(x, y);
	if (container.x !== adjustedX || container.y !== adjustedY) {
		container.setPosition(adjustedX, adjustedY);
	}

	// Update shader animation
	updateShaderAnimation();
}

/**
 * Hides the tooltip.
 */
export function hideTooltip(): void {
	if (container) {
		container.setVisible(false);
	}
}
