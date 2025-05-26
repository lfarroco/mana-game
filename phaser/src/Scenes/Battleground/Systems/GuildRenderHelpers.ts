// Rendering helpers for Guild UI
import * as constants from "../constants";

export function getBenchSlotPosition(index: number) {
	const x = 60 + (index % 3) * constants.TILE_WIDTH + ((index % 3) * 20);
	const y = 150 + Math.floor(index / 5) * constants.TILE_HEIGHT + ((Math.floor(index / 5) * 20));
	return { x, y };
}

export function getBenchCardPosition(index: number) {
	const x = 160 + (index % 3) * constants.TILE_WIDTH + ((index % 3) * 20) + 30;
	const y = 250 + Math.floor(index / 5) * constants.TILE_HEIGHT + ((Math.floor(index / 5) * 20)) + 30;
	return { x, y };
}

export function getItemSlotPosition(index: number, CHEST_TILE_SIZE: number, spacing: number, baseX: number, baseY: number, gridWidth: number) {
	const x = index % gridWidth;
	const y = Math.floor(index / gridWidth);
	return [
		baseX + (x * CHEST_TILE_SIZE) + (x * spacing),
		baseY + (y * CHEST_TILE_SIZE) + (y * spacing)
	];
}
