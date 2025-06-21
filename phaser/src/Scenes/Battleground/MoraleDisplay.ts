import Phaser from 'phaser';
import { defaultTextConfig, FORCE_ID_PLAYER } from '../../constants/constants';

const BAR_WIDTH = 250;
const BAR_HEIGHT = 20;
const BORDER_THICKNESS = 2;

export type MoraleDisplay = {
	container: Container;
	backgroundBar: Graphics;
	foregroundBar: Graphics;
	barFill: Graphics;
	label: Phaser.GameObjects.Text;
}

export function create(
	scene: Phaser.Scene,
	x: number, y: number,
	forceId: string,
	labelText: string,
): MoraleDisplay {
	const container = scene.add.container(x, y);
	// Background
	const backgroundBar = scene.add.graphics();
	backgroundBar.fillStyle(0x000000, 0.5);
	backgroundBar.fillRect(0, 0, BAR_WIDTH, BAR_HEIGHT);
	backgroundBar.lineStyle(BORDER_THICKNESS, 0xffffff, 0.8);
	backgroundBar.strokeRect(0, 0, BAR_WIDTH, BAR_HEIGHT);
	container.add(backgroundBar);

	// Foreground
	const foregroundBar = scene.add.graphics();
	const barColor = forceId === FORCE_ID_PLAYER ? 0x4e9de0 : 0xe04e4e; // Blue for player, Red for CPU
	foregroundBar.fillStyle(barColor, 1);
	foregroundBar.fillRect(0, 0, BAR_WIDTH, BAR_HEIGHT);
	container.add(foregroundBar);

	// Shape to "fill" of the foreground bar
	const barFill = scene.add.graphics();
	barFill.fillStyle(0xffffff);
	barFill.fillRect(0, 0, BAR_WIDTH, BAR_HEIGHT);
	container.add(barFill);

	// Label
	const label = scene.add.text(
		BAR_WIDTH / 2, BAR_HEIGHT / 2,
		labelText, defaultTextConfig
	).setOrigin(0.5);
	container.add(label);

	container.setVisible(false); // Initially hidden

	return {
		container,
		backgroundBar,
		foregroundBar,
		barFill,
		label,
	}
}

export function show({ container }: MoraleDisplay): void {
	container.setVisible(true);
}

export function hide({ container }: MoraleDisplay): void {
	container.setVisible(false);
}

export function updateBar(
	{ barFill }: MoraleDisplay,
	currentMorale: number,
	maxMorale: number = 100,
): void {
	const percentage = Math.max(0, currentMorale) / maxMorale;
	// Animate the mask's horizontal scale to reveal the bar
	barFill.scene.tweens.add(
		{
			targets: barFill,
			scaleX: percentage,
			duration: 200,
		}
	);
}
