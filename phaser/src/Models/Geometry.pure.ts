/**
 * Pure geometric functions - no Phaser dependencies
 * These functions handle calculations and data transformations
 * without depending on Phaser or external libraries.
 */

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

/**
 * Pure implementation of snake distance (Manhattan distance)
 * @param a - First point
 * @param b - Second point
 * @returns Manhattan distance between the points
 */
export const snakeDistanceBetween = (a: { x: number, y: number }) => (b: { x: number, y: number }) =>
	Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const sortBySnakeDistance = (target: Vec2) => (a: Vec2) => (b: Vec2) => {
	const d1 = snakeDistanceBetween(a)(target);
	const d2 = snakeDistanceBetween(b)(target);
	return d1 - d2;
}

/**
 * Pure implementation of rectangle collision detection
 * @param x - Rectangle x position
 * @param y - Rectangle y position  
 * @param w - Rectangle width
 * @param h - Rectangle height
 * @param px - Point x coordinate
 * @param py - Point y coordinate
 * @returns True if point is inside rectangle
 */
export function isInside(
	x: number,
	y: number,
	w: number,
	h: number,
	px: number,
	py: number
): boolean {
	// Handle negative width and height
	const rectX = w < 0 ? x + w : x;
	const rectY = h < 0 ? y + h : y;
	const rectWidth = Math.abs(w);
	const rectHeight = Math.abs(h);

	// Check if point is within rectangle bounds
	return px >= rectX && px <= rectX + rectWidth && py >= rectY && py <= rectY + rectHeight;
}

export const euclideanDistance = (a: Vec2) => (b: Vec2) => {
	return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
