import * as constants from "../constants";
import { vec2, Vec2 } from "../../../Models/Geometry";
import { tween } from "../../../Utils/animation";

let scene: Phaser.Scene;

type GridState = {
	grid: number[][],
	tiles: Phaser.GameObjects.Grid | null
}

export let state: GridState = {
	grid: [[]],
	tiles: null
}

export const resetGrid = () => {
	state.grid = [[]]
}

export function init(sceneRef: Phaser.Scene) {
	scene = sceneRef;
	setupGrid();

}
export function showGrid() {
	tween({
		targets: [state.tiles],
		alpha: 1,
		duration: 1500,
	});
}

export function setupGrid() {
	for (let y = 0; y < constants.MAX_GRID_HEIGHT; y++) {
		state.grid[y] = [];
		for (let x = 0; x < constants.MAX_GRID_WIDTH; x++) {
			state.grid[y][x] = 0;
		}
	}
}

export function createTileGrid() {
	state.tiles = scene.add.grid(
		0, 0,
		constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT,
		constants.TILE_WIDTH, constants.TILE_HEIGHT,
		constants.GRID_FILL_COLOR, 0, constants.GRID_BORDER_COLOR, 0.5,
	).setOrigin(0);
	state.tiles.setInteractive();

	// create outline over tile being hovered
	const hoverOutline = scene.add.graphics();
	// orange
	const color = 0xffa500;
	hoverOutline.lineStyle(2, color, 4);
	hoverOutline.strokeRect(0, 0, constants.TILE_WIDTH, constants.TILE_WIDTH);
	hoverOutline.visible = false;

	// have outline follow cursor
	state.tiles.on("pointermove", (pointer: Phaser.Input.Pointer) => {
		const tile = getTileAt(pointer);

		if (tile) {
			hoverOutline.x = tile.x * constants.TILE_WIDTH;
			hoverOutline.y = tile.y * constants.TILE_HEIGHT;
			hoverOutline.visible = true;
		} else {
			hoverOutline.visible = false;
		}
	});

	return { tiles: state.tiles, hoverOutline };
}

export function getTileAt({ x, y }: { x: number, y: number }): Vec2 | null {

	const x_ = Math.floor(x / constants.TILE_WIDTH);
	const y_ = Math.floor(y / constants.TILE_HEIGHT);

	const isOutOfBounds = x_ < 0
		|| x_ >= constants.MAX_GRID_WIDTH
		|| y_ < 0
		|| y_ >= constants.MAX_GRID_HEIGHT;

	if (isOutOfBounds) {
		return null;
	}

	return vec2(x_, y_);
}