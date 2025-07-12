import Phaser from 'phaser';

const BAR_HEIGHT = 32;
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

export function createStylizedBar(
	scene: Phaser.Scene,
	x: number,
	y: number,
	width: number,
	barColor: number,
	backgroundColor: number,
	labelText: string,
	textConfig: any
): StylizedBar {
	const container = scene.add.container(x, y);

	// Outer border (dark)
	const outerBorder = scene.add.graphics();
	outerBorder.fillStyle(0x2a2a2a, 1);
	outerBorder.fillRoundedRect(0, 0, width, BAR_HEIGHT, 6);
	container.add(outerBorder);

	// Inner background (customizable color)
	const backgroundBar = scene.add.graphics();
	backgroundBar.fillStyle(backgroundColor, 0.6);
	backgroundBar.fillRoundedRect(INNER_PADDING, INNER_PADDING, width - (INNER_PADDING * 2), BAR_HEIGHT - (INNER_PADDING * 2), 3);
	container.add(backgroundBar);

	// Foreground bar (the fill color - this will be animated to show current percentage)
	const foregroundBar = scene.add.graphics();
	foregroundBar.fillStyle(barColor, 1);
	foregroundBar.fillRoundedRect(INNER_PADDING, INNER_PADDING, width - (INNER_PADDING * 2), BAR_HEIGHT - (INNER_PADDING * 2), 3);
	container.add(foregroundBar);

	// We'll use the foregroundBar itself for animation, no need for a separate barFill
	const barFill = foregroundBar; // Just reference the same object

	// Inner highlight (subtle top highlight) - should scale with the bar
	const innerHighlight = scene.add.graphics();
	innerHighlight.fillStyle(0xffffff, 0.3);
	innerHighlight.fillRoundedRect(INNER_PADDING + 1, INNER_PADDING + 1, width - (INNER_PADDING * 2) - 2, (BAR_HEIGHT - (INNER_PADDING * 2)) / 3, 2);
	container.add(innerHighlight);

	// Label with stroke for better readability
	const label = scene.add.text(
		width / 2, BAR_HEIGHT / 2,
		labelText, {
		...textConfig,
		fontSize: '14px',
		fontStyle: 'bold',
		color: '#ffffff',
		stroke: '#000000',
		strokeThickness: 3
	}
	).setOrigin(0.5);
	container.add(label);

	container.setVisible(false); // Initially hidden

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
	// Animate both the bar and highlight's horizontal scale
	bar.barFill.scene.tweens.add(
		{
			targets: [bar.barFill, bar.innerHighlight],
			scaleX: percentage,
			duration: duration,
		}
	);
}
