import Phaser from "phaser"

// Re-export all pure functions
export * from "./Geometry.pure";

// Phaser-specific implementations that override the pure versions
export const snakeDistanceBetween = (a: { x: number, y: number }) => (b: { x: number, y: number }) =>
	Phaser.Math.Distance.Snake(a.x, a.y, b.x, b.y);

export function isInside(
	x: number,
	y: number,
	w: number,
	h: number,
	px: number,
	py: number
): boolean {
	// sometimes width and height can be negative
	// we need our rect to always be positive so that the collision may work
	return new Phaser.Geom.Rectangle(
		w < 0 ? x + w : x,
		h < 0 ? y + h : y,
		Math.abs(w),
		Math.abs(h)
	).contains(px, py);
}
