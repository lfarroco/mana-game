import Phaser from 'phaser';
import { titleTextConfig } from '../../constants/constants';

const BAR_HEIGHT = 50;
const INNER_PADDING = 3;

// This type represents the components of a stylized bar
export type StylizedBar = {
	container: Phaser.GameObjects.Container;
	outerBorder: Phaser.GameObjects.Graphics;
	backgroundBar: Phaser.GameObjects.Graphics;
	foregroundBar: Phaser.GameObjects.Graphics;
	barFill: Phaser.GameObjects.Graphics;
	innerHighlight: Phaser.GameObjects.Graphics;
	label: Phaser.GameObjects.Text;
}

import { TextConfig } from "../../Types/CommonTypes";

export interface StylizedBarOptions {
	x: number;
	y: number;
	width: number;
	height?: number;
	barColor?: number;
	backgroundColor?: number;
	backgroundOpacity?: number;
	borderOpacity?: number;
	textConfig?: TextConfig;
	orientation?: 'horizontal' | 'vertical';
}

export function createStylizedBar(
	scene: Phaser.Scene,
	options: StylizedBarOptions
): StylizedBar {
	const {
		x,
		y,
		width,
		height = BAR_HEIGHT,
		barColor = 0x00ff00, // Default green
		backgroundColor = 0x000000, // Default black
		backgroundOpacity = 0.6, // Default semi-transparent
		borderOpacity = 1.0, // Default fully opaque border
		orientation = 'horizontal'
	} = options;
	const container = scene.add.container(x, y);

	const isVertical = orientation === 'vertical';
	// For vertical bars: width is the thin dimension, height is the tall dimension
	// For horizontal bars: width is the long dimension, height is the short dimension
	const barWidth = width;
	const barHeight = height;

	// Outer border (dark)
	const outerBorder = scene.add.graphics();
	outerBorder.fillStyle(0x2a2a2a, borderOpacity);
	outerBorder.fillRoundedRect(0, 0, barWidth, barHeight, 6);
	container.add(outerBorder);

	// Inner background (customizable color)
	const backgroundBar = scene.add.graphics();
	backgroundBar.fillStyle(backgroundColor, backgroundOpacity);
	backgroundBar.fillRoundedRect(
		INNER_PADDING, INNER_PADDING,
		barWidth - (INNER_PADDING * 2), barHeight - (INNER_PADDING * 2),
		3
	);
	container.add(backgroundBar);

	// Foreground bar (the fill color - this will be animated to show current percentage)
	const foregroundBar = scene.add.graphics();
	foregroundBar.fillStyle(barColor, 1);
	foregroundBar.fillRoundedRect(
		INNER_PADDING, INNER_PADDING,
		barWidth - (INNER_PADDING * 2), barHeight - (INNER_PADDING * 2),
		3
	);
	container.add(foregroundBar);

	// We'll use the foregroundBar itself for animation, no need for a separate barFill
	const barFill = foregroundBar; // Just reference the same object

	// Inner highlight (subtle top highlight) - should scale with the bar
	const innerHighlight = scene.add.graphics();
	innerHighlight.fillStyle(0xffffff, 0.3);
	if (isVertical) {
		innerHighlight.fillRoundedRect(
			INNER_PADDING + 1, INNER_PADDING + 1,
			(barWidth - (INNER_PADDING * 2)) / 3, barHeight - (INNER_PADDING * 2) - 2,
			2
		);
	} else {
		innerHighlight.fillRoundedRect(
			INNER_PADDING + 1, INNER_PADDING + 1,
			barWidth - (INNER_PADDING * 2) - 2, (barHeight - (INNER_PADDING * 2)) / 3,
			2
		);
	}
	container.add(innerHighlight);

	// Label with stroke for better readability
	const label = scene.add.text(
		barWidth / 2, barHeight + 20,
		'', {
		...titleTextConfig,
	}
	).setOrigin(0.5);
	container.add(label);

	container.setVisible(false); // Initially hidden

	// Store orientation and original dimensions for later use in updates
	(container as any)._orientation = orientation;
	(container as any)._originalHeight = barHeight;

	return {
		container,
		outerBorder,
		backgroundBar,
		foregroundBar,
		barFill,
		innerHighlight,
		label,
	}
}

export function updateStylizedBar(
	bar: StylizedBar,
	currentValue: number,
	maxValue: number,
	duration: number = 200
): void {
	const percentage = Math.max(0, currentValue) / maxValue;
	const isVertical = (bar.container as any)._orientation === 'vertical';

	if (isVertical) {
		// For vertical bars, scale from bottom by adjusting the origin
		// Stop any existing tweens to prevent conflicts
		bar.barFill.scene.tweens.killTweensOf([bar.barFill, bar.innerHighlight]);

		// Get the original height from when the bar was created
		const originalHeight = (bar.container as any)._originalHeight || BAR_HEIGHT;
		const fillHeight = originalHeight - (INNER_PADDING * 2);

		// Calculate the Y offset to simulate scaling from bottom
		const targetScaleY = percentage;
		const yOffset = INNER_PADDING + fillHeight * (1 - targetScaleY);

		bar.barFill.scene.tweens.add({
			targets: [bar.barFill, bar.innerHighlight],
			scaleY: targetScaleY,
			y: yOffset,
			duration: duration,
		});
	} else {
		// Horizontal bars (original behavior)
		bar.barFill.scene.tweens.killTweensOf([bar.barFill, bar.innerHighlight]);
		bar.barFill.scene.tweens.add({
			targets: [bar.barFill, bar.innerHighlight],
			scaleX: percentage,
			duration: duration,
		});
	}
}
