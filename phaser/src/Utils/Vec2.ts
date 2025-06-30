/**
 * Simple 2D vector type without external dependencies
 */
export type Vec2 = {
	readonly x: number;
	readonly y: number;
};

export const vec2 = (x: number, y: number): Vec2 => ({ x, y });

export const vec2Zero = (): Vec2 => vec2(0, 0);

export const eqVec2 = (a: Vec2, b: Vec2): boolean => a.x === b.x && a.y === b.y;

export const addVec2 = (a: Vec2, b: Vec2): Vec2 => vec2(a.x + b.x, a.y + b.y);

export const subVec2 = (a: Vec2, b: Vec2): Vec2 => vec2(a.x - b.x, a.y - b.y);

export const mulVec2 = (v: Vec2, scalar: number): Vec2 => vec2(v.x * scalar, v.y * scalar);

export const distanceSquared = (a: Vec2, b: Vec2): number => {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy;
};

export const distance = (a: Vec2, b: Vec2): number => Math.sqrt(distanceSquared(a, b));
