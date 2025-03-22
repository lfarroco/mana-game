import * as constants from "../constants";
import { vec2, Vec2 } from "../../../Models/Geometry";
import { listeners, signals } from "../../../Models/Signals";
import { tween } from "../../../Utils/animation";
import { getState } from "../../../Models/State";

let scene: Phaser.Scene;

export let grid: number[][] = [[]];
export let tiles: Phaser.GameObjects.Grid;

export const clearGrid = () => {
	grid.length = 0;
	grid.push([]);
}

export function init(sceneRef: Phaser.Scene) {
	scene = sceneRef;
	const state = getState();
	setupGrid();

	listeners([
		[signals.WAVE_START, () => {
			tween({
				targets: [tiles],
				alpha: 0,
				duration: 500 / state.options.speed,
				ease: 'Power2',
			});

		}],
		[signals.WAVE_FINISHED, () => {
			tween({
				targets: [tiles],
				alpha: 1,
				duration: 9500 / state.options.speed,
				ease: 'Power2',
			});
		}]
	])
}

export function setupGrid() {
	for (let y = 0; y < 32; y++) {
		grid[y] = [];
		for (let x = 0; x < 32; x++) {
			grid[y][x] = 0;
		}
	}
}

export function createTileGrid() {
	tiles = scene.add.grid(
		0, 0,
		constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT,
		constants.TILE_WIDTH, constants.TILE_HEIGHT,
		0x000000, 0, 0x00FF00, 0.5,
	).setOrigin(0);
	tiles.setInteractive();

	// create outline over tile being hovered
	const hoverOutline = scene.add.graphics();
	// orange
	const color = 0xffa500;
	hoverOutline.lineStyle(2, color, 4);
	hoverOutline.strokeRect(0, 0, constants.TILE_WIDTH, constants.TILE_WIDTH);
	hoverOutline.visible = false;

	// have outline follow cursor
	scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
		const tile = getTileAt(pointer);

		if (tile) {
			hoverOutline.x = tile.x * constants.TILE_WIDTH;
			hoverOutline.y = tile.y * constants.TILE_HEIGHT;
			hoverOutline.visible = true;
		} else {
			hoverOutline.visible = false;
		}
	});

	return { tiles, hoverOutline };
}

export function getTileAt({ x, y }: { x: number, y: number }): Vec2 {
	return vec2(
		Math.floor(x / constants.TILE_WIDTH),
		Math.floor(y / constants.TILE_HEIGHT)
	);
}