

export type Vec2 = [number, number];

export type Size = [number, number];

export const eqVec2 = ([x1, y1]: Vec2, [x2, y2]: Vec2) => x1 === x2 && y1 === y2;

export const sumVec2 = ([x1, y1]: Vec2, [x2, y2]: Vec2) => [x1 + x2, y1 + y2];

export const centerOf = ([width, height]: Size) => [width / 2, height / 2];

export const snakeDistanceBetween = ([x1, y1]: Vec2, [x2, y2]: Vec2): number => {
	const dx = Math.abs(x1 - x2);
	const dy = Math.abs(y1 - y2);
	return dx + dy;
}

export const distanceBetween = ([x1, y1]: Vec2, [x2, y2]: Vec2): number => {
	const dx = x1 - x2;
	const dy = y1 - y2;
	return Math.sqrt(dx * dx + dy * dy);
}

export function isInside(
	[x, y]: Vec2,
	[w, h]: Size,
	[px, py]: Vec2
): boolean {
	const rectX = w < 0 ? x + w : x;
	const rectY = h < 0 ? y + h : y;
	const rectWidth = Math.abs(w);
	const rectHeight = Math.abs(h);

	return (
		px >= rectX &&
		px <= rectX + rectWidth &&
		py >= rectY &&
		py <= rectY + rectHeight
	);
}	