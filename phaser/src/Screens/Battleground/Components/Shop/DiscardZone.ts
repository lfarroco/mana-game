import * as Constants from "@Constants";
import * as i18n from "@i18n/i18n";
import { env, makeContainer as container, borderedRoundRect, rectangularDropZone } from "@Env";

// Discard zone UI constants
const DISCARD_ZONE_X = 1400;
const DISCARD_ZONE_Y = 500;
const DISCARD_ZONE_WIDTH = 900;
const DISCARD_ZONE_HEIGHT = 800;
const DISCARD_ZONE_COLOR = 0xffa500;
const DISCARD_ZONE_ALPHA = 0.7;
const DISCARD_ZONE_CORNER_RADIUS = 10;
const DISCARD_ZONE_LABEL_FONT_SIZE = "40px";
const DISCARD_ZONE_STROKE_THICKNESS = 6;
const DISCARD_ZONE_SHADOW_OFFSET_X = 2;
const DISCARD_ZONE_SHADOW_OFFSET_Y = 2;
const DISCARD_ZONE_SHADOW_BLUR = 4;

let zone: Phaser.GameObjects.Zone | null = null;
let zoneContainer: Phaser.GameObjects.Container | null = null;
let labelText: Phaser.GameObjects.Text | null = null;
let rect: Phaser.GameObjects.Graphics | null = null;

const position = [DISCARD_ZONE_X, DISCARD_ZONE_Y] as Vec2;
const size = [DISCARD_ZONE_WIDTH, DISCARD_ZONE_HEIGHT] as Vec2;
const color = DISCARD_ZONE_COLOR;
const alpha = DISCARD_ZONE_ALPHA;

export const name = "shop_discard_zone";
const textStyle = {
	...Constants.defaultTextConfig,
	fontSize: DISCARD_ZONE_LABEL_FONT_SIZE,
	color: "#fff",
	fontStyle: "bold",
	stroke: "#222",
	strokeThickness: DISCARD_ZONE_STROKE_THICKNESS,
	align: "center",
	shadow: {
		offsetX: DISCARD_ZONE_SHADOW_OFFSET_X,
		offsetY: DISCARD_ZONE_SHADOW_OFFSET_Y,
		color: "#000",
		blur: DISCARD_ZONE_SHADOW_BLUR,
		fill: true,
	},
};

export function create() {
	zoneContainer = container();

	rect = createRect();

	labelText = createLabel();

	zone = rectangularDropZone(env.scene, name, position, size);

	zoneContainer.add([zone, rect, labelText]);

	zoneContainer.setVisible(false);

	return zoneContainer;
}

export function show() {
	env.scene.children.bringToTop(zoneContainer!);
	zoneContainer!.setVisible(true);
}

export function hide() {
	zoneContainer!.setVisible(false);
}

export function destroy() {
	zoneContainer!.destroy(true);
	zoneContainer = null;
}

const createRect = () =>
	borderedRoundRect(env.scene, position, size, DISCARD_ZONE_CORNER_RADIUS, color, alpha);

const createLabel = () => {
	const text = env.scene.add.text(0, 0, i18n.t("shop.discard"), textStyle);

	text.setPosition(position[0], position[1]);

	text.setOrigin(0.5);

	return text;
};
