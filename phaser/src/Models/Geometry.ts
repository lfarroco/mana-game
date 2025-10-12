import Phaser from "phaser"

export const vec2 = (x: number, y: number): Vec2 => ({
	x, y
});

export const size = (width: number, height: number): Size => ({
	width, height
});

export const asVec2 = ({ x, y }: { x: number; y: number; }): Vec2 => vec2(x, y);

export const eqVec2 = (v1: Vec2, v2: Vec2) => v1.x === v2.x && v1.y === v2.y;

export const sumVec2 = (v1: Vec2, v2: Vec2) => vec2(v1.x + v2.x, v1.y + v2.y);

export const centerOf = (dim: Size) => vec2(dim.width / 2, dim.height / 2)

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
