// Chip styling
const CHIP_FONT_SIZE = 32;
const CHIP_PADDING = 12;
const CHIP_STROKE_WIDTH = 2;
const CHIP_STROKE_COLOR = 0xffffff;
const CHIP_STROKE_ALPHA = 0.5;
const CHIP_FILL_ALPHA = 0.7;
const CHIP_CORNER_RADIUS = 4;

// Chip animation
const CHIP_PULSE_SCALE = 1.2;
const CHIP_PULSE_DURATION_MS = 200;

import * as constants from "@Constants";
import { env } from "@Env";

const index = new Map<
	string,
	{
		container: Phaser.GameObjects.Container;
		bg: Phaser.GameObjects.Graphics;
		text: Phaser.GameObjects.Text;
		color: number;
		minWidth?: number;
		tween?: Phaser.Tweens.Tween;
	}
>();

export function createChip(
	id: string,
	[x, y]: Vec2,
	color: number,
	value: string,
	minWidth?: number
) {
	const text = env.scene.add
		.text(0, 0, value, constants.defaultTextConfig)
		.setFontSize(CHIP_FONT_SIZE);
	text.setOrigin(0.5);

	const [width, height] = [
		Math.max(text.width + CHIP_PADDING, minWidth ?? 0),
		text.height + CHIP_PADDING,
	];
	const bg = text.scene.add.graphics();

	bg.lineStyle(CHIP_STROKE_WIDTH, CHIP_STROKE_COLOR, CHIP_STROKE_ALPHA);
	bg.fillStyle(color, CHIP_FILL_ALPHA);
	bg.fillRoundedRect(-width / 2, -height / 2, width, height, CHIP_CORNER_RADIUS);
	bg.strokeRoundedRect(-width / 2, -height / 2, width, height, CHIP_CORNER_RADIUS);

	const container = text.scene.add.container(x, y, [bg, text]);

	index.set(id, { container, bg, text, color, minWidth });

	container.once("destroy", () => {
		index.delete(id);
	});

	return {
		container,
		bg,
		text,
		size: [width, height] as Vec2,
	};
}

export function updateChipText(id: string, value: string) {
	const state = index.get(id);
	if (!state) return;

	const { container, bg, text, color, minWidth } = state;
	text.setText(value);

	const newSize = {
		width: Math.max(text.width + CHIP_PADDING, minWidth ?? 0),
		height: text.height + CHIP_PADDING,
	};

	bg.clear();
	bg.lineStyle(CHIP_STROKE_WIDTH, CHIP_STROKE_COLOR, CHIP_STROKE_ALPHA);
	bg.fillStyle(color, CHIP_FILL_ALPHA);
	bg.fillRoundedRect(
		-newSize.width / 2,
		-newSize.height / 2,
		newSize.width,
		newSize.height,
		CHIP_CORNER_RADIUS
	);
	bg.strokeRoundedRect(
		-newSize.width / 2,
		-newSize.height / 2,
		newSize.width,
		newSize.height,
		CHIP_CORNER_RADIUS
	);

	if (state.tween?.isPlaying()) {
		state.tween.stop();
		container.setScale(1);
	}

	state.tween = container.scene.tweens.add({
		targets: container,
		scaleX: CHIP_PULSE_SCALE,
		scaleY: CHIP_PULSE_SCALE,
		duration: CHIP_PULSE_DURATION_MS,
		yoyo: true,
		ease: "Power1",
	});
}

export function getChip(id: string) {
	return index.get(id);
}
