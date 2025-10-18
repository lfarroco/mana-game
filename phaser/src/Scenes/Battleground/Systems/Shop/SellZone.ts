import { defaultTextConfig } from "../../../../Constants/constants";
import * as ph from "@PhaserIO";

export let zone: Phaser.GameObjects.Zone | null = null;
let container: Container | null = null;
let labelText: Phaser.GameObjects.Text | null = null;
let rect: Graphics | null = null;

const position = { x: 1400, y: 500 }
const size = { width: 900, height: 800 }
const color = 0xffa500;
const alpha = 0.7;
const label = "SELL";
const cornerRadius = 10;
export const name = "shop_sell_zone";
const textStyle = {
	...defaultTextConfig,
	fontSize: '40px', color: '#fff', fontStyle: 'bold',
	stroke: '#222',
	strokeThickness: 6,
	align: 'center',
	shadow: {
		offsetX: 2,
		offsetY: 2,
		color: '#000',
		blur: 4,
		fill: true
	}
}

export function create() {

	container = ph.Container();

	rect = createRect();

	labelText = createLabel();

	zone = ph.RectangularDropZone(name, position, size);

	ph.AddChildren(container, [zone, rect, labelText]);

	ph.Hide(container);

	return container;
}

export function show() {
	ph.BringToTop(container!);
	ph.Show(container!);
}

export function hide() {
	ph.Hide(container!);
}

export function destroy() {
	ph.Destroy(container!);
	container = null;
}

const createRect = () => ph.BorderedRoundRect(
	position,
	size,
	cornerRadius,
	color,
	alpha
);

const createLabel = () => {
	const text = ph.Text(
		position,
		label,
		textStyle
	);

	ph.Centralize(text);

	return text;
}