import Phaser from 'phaser';

const BAR_HEIGHT = 50;
const INNER_PADDING = 3;

export type StylizedBar = {
	container: Container;
	outerBorder: Graphics;
	backgroundBar: Graphics;
	foregroundBar: Graphics;
	barFill: Graphics;
	innerHighlight: Graphics;
}


export interface StylizedBarOptions {
	x: number;
	y: number;
	width: number;
	height?: number;
	barColor?: number;
	backgroundColor?: number;
	backgroundOpacity?: number;
	borderOpacity?: number;
	textConfig?: Phaser.Types.GameObjects.Text.TextStyle;
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
		barColor = 0x00ff00,
		backgroundColor = 0x000000,
		backgroundOpacity = 0.6,
		borderOpacity = 1.0,
	} = options;
	const container = scene.add.container(x, y);

	const barWidth = width;
	const barHeight = height;

	const outerBorder = scene.add.graphics();
	outerBorder.fillStyle(0x2a2a2a, borderOpacity);
	outerBorder.fillRoundedRect(0, 0, barWidth, barHeight, 6);
	container.add(outerBorder);

	const backgroundBar = scene.add.graphics();
	backgroundBar.fillStyle(backgroundColor, backgroundOpacity);
	backgroundBar.fillRoundedRect(
		INNER_PADDING, INNER_PADDING,
		barWidth - (INNER_PADDING * 2), barHeight - (INNER_PADDING * 2),
		3
	);
	container.add(backgroundBar);

	const foregroundBar = scene.add.graphics();
	foregroundBar.fillStyle(barColor, 1);
	foregroundBar.fillRoundedRect(
		INNER_PADDING, INNER_PADDING,
		barWidth - (INNER_PADDING * 2), barHeight - (INNER_PADDING * 2),
		3
	);
	container.add(foregroundBar);

	const barFill = foregroundBar;

	const innerHighlight = scene.add.graphics();
	innerHighlight.fillStyle(0xffffff, 0.3);
	innerHighlight.fillRoundedRect(
		INNER_PADDING + 1, INNER_PADDING + 1,
		(barWidth - (INNER_PADDING * 2)) / 3, barHeight - (INNER_PADDING * 2) - 2,
		2
	);

	container.add(innerHighlight);

	container.setVisible(false);

	(container as any)._originalHeight = barHeight;

	return {
		container,
		outerBorder,
		backgroundBar,
		foregroundBar,
		barFill,
		innerHighlight,
	}
}

export function updateStylizedBar(
	bar: StylizedBar,
	currentValue: number,
	maxValue: number,
	duration: number = 200
): void {
	const percentage = Math.max(0, currentValue) / maxValue;
	bar.barFill.scene.tweens.killTweensOf([bar.barFill, bar.innerHighlight]);

	const originalHeight = (bar.container as any)._originalHeight || BAR_HEIGHT;
	const fillHeight = originalHeight - (INNER_PADDING * 2);

	const targetScaleY = percentage;
	const yOffset = INNER_PADDING + fillHeight * (1 - targetScaleY);

	bar.barFill.scene.tweens.add({
		targets: [bar.barFill, bar.innerHighlight],
		scaleY: targetScaleY,
		y: yOffset,
		duration: duration,
	});

}
