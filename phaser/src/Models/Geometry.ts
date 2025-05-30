import Phaser from "phaser"

export type Vec2 = {
	tag: "_vec2",
	x: number,
	y: number,
}

export const vec2Zero = (): Vec2 => vec2(0, 0)

export const vec2 = (x: number, y: number): Vec2 => ({
	tag: "_vec2",
	x, y
});

export const randomVec2InRange = (
	[minX, maxX]: [number, number],
	[minY, maxY]: [number, number],
): Vec2 => {
	const x = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
	const y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
	return vec2(x, y);
}
export const asVec2 = ({ x, y }: { x: number, y: number }): Vec2 => vec2(x, y)

export const eqVec2 = (v1: Vec2, v2: Vec2) => v1.x === v2.x && v1.y === v2.y

export const sumVec2 = (v1: Vec2) => (v2: Vec2): Vec2 => vec2(v1.x + v2.x, v1.y + v2.y)

// curried version of eqVec2
export const eqVec2_ = (v1: Vec2) => (v2: Vec2) => eqVec2(v1, v2)

export const snakeDistanceBetween = (a: { x: number, y: number }) => (b: { x: number, y: number }) =>
	Phaser.Math.Distance.Snake(a.x, a.y, b.x, b.y);

export const sortBySnakeDistance = (target: Vec2) => (a: Vec2) => (b: Vec2) => {
	const d1 = snakeDistanceBetween(a)(target);
	const d2 = snakeDistanceBetween(b)(target);
	return d1 - d2;
}
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

export const euclideanDistance = (a: Vec2) => (b: Vec2) => {
	return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
