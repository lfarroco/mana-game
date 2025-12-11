import { size } from "@Models/Geometry";
import * as io from "@PhaserIO";

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

export function createChip(id: string, position: Vec2, color: number, value: string, minWidth?: number) {
	const text = io.Label(value)
		.setFontSize(32);
	io.Centralize(text);

	const chipSize = size(Math.max(text.width + 12, minWidth ?? 0), text.height + 12);
	const bg = text.scene.add.graphics();

	bg.lineStyle(2, 0xffffff, 0.5);
	bg.fillStyle(color, 0.7);
	bg.fillRoundedRect(-chipSize.width / 2, -chipSize.height / 2, chipSize.width, chipSize.height, 4);
	bg.strokeRoundedRect(-chipSize.width / 2, -chipSize.height / 2, chipSize.width, chipSize.height, 4);

	const container = text.scene.add.container(position.x, position.y, [bg, text]);

	index.set(id, { container, bg, text, color, minWidth });

	io.OnceDestroyed(container, () => {
		index.delete(id);
	});

	return { container, bg, text, size: chipSize };
}

export function updateChipText(id: string, value: string) {
	const state = index.get(id);
	if (!state) return;

	const { container, bg, text, color, minWidth } = state;
	text.setText(value);

	const newSize = { width: Math.max(text.width + 12, minWidth ?? 0), height: text.height + 12 };

	bg.clear();
	bg.lineStyle(2, 0xffffff, 0.5);
	bg.fillStyle(color, 0.7);
	bg.fillRoundedRect(-newSize.width / 2, -newSize.height / 2, newSize.width, newSize.height, 4);
	bg.strokeRoundedRect(-newSize.width / 2, -newSize.height / 2, newSize.width, newSize.height, 4);

	if (state.tween?.isPlaying()) {
		state.tween.stop();
		container.setScale(1);
	}

	state.tween = container.scene.tweens.add({
		targets: container,
		scaleX: 1.2,
		scaleY: 1.2,
		duration: 200,
		yoyo: true,
		ease: "Power1",
	});
}

export function getChip(id: string) {
	return index.get(id)
}