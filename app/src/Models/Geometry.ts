
export type Vec2 = {
	tag: "_vec2",
	x: number,
	y: number,
}

export const vec2 = (x: number, y: number): Vec2 => ({
	tag: "_vec2",
	x, y
})
export const asVec2 = ({ x, y }: { x: number, y: number }): Vec2 => vec2(x, y)

export const eqVec2 = (v1: Vec2, v2: Vec2) => v1.x === v2.x && v1.y === v2.y

// curried version of eqVec2
export const eqVec2_ = (v1: Vec2) => (v2: Vec2) => eqVec2(v1, v2)

export const distanceBetween = (a: Vec2) => (b: Vec2) => {
	return Math.sqrt(
		Math.pow(a.x - b.x, 2) +
		Math.pow(a.y - b.y, 2)
	);
};

