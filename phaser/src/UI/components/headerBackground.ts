import { scene } from "@Scenes/Battleground/BattlegroundScene";

const COLOR_DARK_GRAY = 0x1f1f1f;
const ALPHA = 0.8;

const TOP_Y = 0;
const HEIGHT = 70;
const START_X = 0;
const END_X = 640;
const SLOPE = 40;

export function create() {
	const graphics = scene.add.graphics();

	graphics.fillStyle(COLOR_DARK_GRAY, ALPHA);

	const points = [
		{ x: START_X, y: TOP_Y },
		{ x: END_X, y: TOP_Y },
		{ x: END_X - SLOPE, y: TOP_Y + HEIGHT },
		{ x: START_X + SLOPE, y: TOP_Y + HEIGHT }
	];

	graphics.fillPoints(points, true);

	return graphics;
}
