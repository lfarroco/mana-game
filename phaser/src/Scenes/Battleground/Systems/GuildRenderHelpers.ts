// Rendering helpers for Guild UI

export function getItemSlotPosition(index: number, CHEST_TILE_SIZE: number, spacing: number, baseX: number, baseY: number, gridWidth: number) {
	const x = index % gridWidth;
	const y = Math.floor(index / gridWidth);
	return [
		baseX + (x * CHEST_TILE_SIZE) + (x * spacing),
		baseY + (y * CHEST_TILE_SIZE) + (y * spacing)
	];
}
