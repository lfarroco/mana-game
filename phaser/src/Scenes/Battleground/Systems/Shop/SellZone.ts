import { TAVERN_BG_HEIGHT, TAVERN_BG_WIDTH } from "./constants";
import { defaultTextConfig } from "../../../../constants/constants";
import * as io from "./phaser.io";
import * as geom from "@Models/Geometry";

let sellZone: Phaser.GameObjects.Zone | null = null;
let container: Container | null = null;
let sellZoneText: Phaser.GameObjects.Text | null = null;
let sellZoneGraphics: Graphics | null = null;

const position = { x: 950, y: 100 }
const size = { width: TAVERN_BG_WIDTH, height: TAVERN_BG_HEIGHT }
const color = 0xffa500;
const alpha = 0.7;
const text = "SELL";
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

	container = io.Container();

	sellZone = io.RectangularDropZone(name, position, size);

	sellZoneGraphics = io.BorderedRoundRect(
		position,
		size,
		cornerRadius,
		color,
		alpha
	);

	sellZoneText = io.Text(
		geom.sumVec2(position, geom.centerOf(size)),
		text,
		textStyle
	);

	io.Centralize(sellZoneText);

	io.AddChildren(container, [sellZone, sellZoneGraphics, sellZoneText]);

	io.SetVisible(container, false);

	return container;
}

export function show() {
	io.BringToTop(container!);
	io.SetVisible(container!, true);
}

export function hide() {
	io.SetVisible(container!, false);
}

export function destroy() {
	io.Destroy(container!);
	container = null;
}