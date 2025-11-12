import { defaultTextConfig } from "@Constants/constants";
import { asVec2, size } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";
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

	const scene = getCurrentScene();

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

	scene.children.moveBelow(bg, text)

	index.set(id, { bg, text, })

	bg.on('destroy', () => {
		index.delete(id);
	});

	return [bg, text]
}

export function updateChipText(id: string, value: string) {
	const state = index.get(id);
	if (!state) return;

	state.text.setText(value);
}