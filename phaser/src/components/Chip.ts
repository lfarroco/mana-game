import { defaultTextConfig } from "@Constants/constants";
import { asVec2, size } from "@Models/Geometry";
import * as io from "@PhaserIO";

const index = new Map<string, {
	bg: Graphics;
	text: Phaser.GameObjects.Text;
}>();


export function createChip(
	id: string,
	position: Vec2,
	color: number,
	value: string
) {

	const text = io.Text(
		value,
		defaultTextConfig
	);
	io.SetPosition(text, position);
	io.Centralize(text);

	const bg = io.BorderedRoundRect(
		asVec2(text),
		size(
			text.width + 4,
			text.height + 4,
		),
		4,
		color
	)

	io.MoveBelow(bg, text)

	index.set(id, { bg, text, })

	io.OnceDestroyed(bg, () => {
		index.delete(id);
	});

	return [bg, text]
}

export function updateChipText(id: string, value: string) {
	const state = index.get(id);
	if (!state) return;

	state.text.setText(value);
}