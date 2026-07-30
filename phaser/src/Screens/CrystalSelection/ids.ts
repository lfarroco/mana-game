// ---------------------------------------------------------------------------
// Element IDs shared between CrystalSelectionScreen and its effects.
// Kept in a separate file to avoid circular imports (updateDisplay needs IDs
// but CrystalSelectionScreen imports Effects → updateDisplay).
// ---------------------------------------------------------------------------

export const CRYSTAL_IDS = {
	background: "crystal.background",
	sprite: "crystal.sprite",
	name: "crystal.name",
	description: "crystal.description",
	title: "crystal.title",
	seedWarning: "crystal.seed-warning",
} as const;

export function paginationDotId(i: number): string {
	return `crystal.pagination-dot-${i}`;
}
