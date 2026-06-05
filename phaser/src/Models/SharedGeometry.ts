// TODO: this should not exist, geom is geom
// free geom from phaser

export interface Vec2 {
	x: number;
	y: number;
}

export interface Size {
	width: number;
	height: number;
}

export const vec2 = (x: number, y: number): Vec2 => ({
	x,
	y,
});

export const size = (width: number, height: number): Size => ({
	width,
	height,
});

export const asVec2 = ({ x, y }: { x: number; y: number }): Vec2 => vec2(x, y);

export const eqVec2 = (v1: Vec2, v2: Vec2) => v1.x === v2.x && v1.y === v2.y;

export const sumVec2 = (v1: Vec2, v2: Vec2) => vec2(v1.x + v2.x, v1.y + v2.y);

export const centerOf = (dim: Size) => vec2(dim.width / 2, dim.height / 2);
