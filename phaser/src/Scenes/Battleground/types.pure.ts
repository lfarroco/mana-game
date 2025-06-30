/**
 * Minimal Vec2 type for pure function testing without Phaser dependencies
 */
export type Vec2Pure = {
	x: number;
	y: number;
};

export const vec2Pure = (x: number, y: number): Vec2Pure => ({ x, y });

export const eqVec2Pure = (a: Vec2Pure, b: Vec2Pure): boolean => a.x === b.x && a.y === b.y;
