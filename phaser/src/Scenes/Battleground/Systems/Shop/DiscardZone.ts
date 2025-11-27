import { defaultTextConfig } from "@Constants/constants";
import * as io from "@PhaserIO";

export let zone: Phaser.GameObjects.Zone | null = null;
let container: Container | null = null;
let labelText: Phaser.GameObjects.Text | null = null;
let rect: Graphics | null = null;

const position = { x: 1400, y: 500 };
const size = { width: 900, height: 800 };
const color = 0xffa500;
const alpha = 0.7;
const label = "DISCARD";
const cornerRadius = 10;
export const name = "shop_discard_zone";
const textStyle = {
	...defaultTextConfig,
	fontSize: "40px",
	color: "#fff",
	fontStyle: "bold",
	stroke: "#222",
	strokeThickness: 6,
	align: "center",
	shadow: {
		offsetX: 2,
		offsetY: 2,
		color: "#000",
		blur: 4,
		fill: true,
	},
};

export function create() {
	container = io.Container();

	rect = createRect();

	labelText = createLabel();

	zone = io.RectangularDropZone(name, position, size);

	io.AddChildren(container, [zone, rect, labelText]);

	io.Hide(container);

	return container;
}

export function show() {
	io.BringToTop(container!);
	io.Show(container!);
}

export function hide() {
	io.Hide(container!);
}

export function destroy() {
	io.Destroy(container!);
	container = null;
}

const createRect = () => io.BorderedRoundRect(position, size, cornerRadius, color, alpha);

const createLabel = () => {
	const text = io.Text(label, textStyle);

	io.SetPosition(text, position);

	io.Centralize(text);

	return text;
};
