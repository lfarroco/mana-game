import { defaultTextConfig } from "@Constants/constants";
import { asVec2, size, sumVec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";

const index = new Map<
	string,
	{
		bg: Graphics;
		text: Phaser.GameObjects.Text;
		color: number;
		minWidth?: number;
	}
>();

export function createChip(id: string, position: Vec2, color: number, value: string, minWidth?: number) {
	const text = io.Text(value, defaultTextConfig);
	io.SetPosition(text, position);
	io.Centralize(text);

	const width = Math.max(text.width + 12, minWidth ?? 0);
	const bg = io.BorderedRoundRect(asVec2(text), size(width, text.height + 12), 4, color);

	io.MoveBelow(bg, text);

	index.set(id, { bg, text, color, minWidth });

	io.OnceDestroyed(bg, () => {
		index.delete(id);
	});

	return [bg, text];
}

export function updateChipText(id: string, value: string) {
	const state = index.get(id);
	if (!state) return;

	state.text.setText(value);

	const { bg, text, color, minWidth } = state;
	const newSize = { width: Math.max(text.width + 12, minWidth ?? 0), height: text.height + 12 };
	const textPosition = asVec2(text);
	const newActualPos = sumVec2(textPosition, { x: -newSize.width / 2, y: -newSize.height / 2 });

	bg.clear();
	bg.lineStyle(2, 0xffffff, 0.5);
	bg.fillStyle(color, 0.7);
	bg.fillRoundedRect(0, 0, newSize.width, newSize.height, 4);
	bg.strokeRoundedRect(0, 0, newSize.width, newSize.height, 4);
	bg.setPosition(newActualPos.x, newActualPos.y);
}
