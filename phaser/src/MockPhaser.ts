export class Vector2 {
	x: number;
	y: number;
	constructor(x: number = 0, y: number = 0) {
		this.x = x;
		this.y = y;
	}
	set(x: number, y: number) { this.x = x; this.y = y; return this; }
}

export const Math = {
	Vector2: Vector2,
	Distance: {
		Between: (x1: number, y1: number, x2: number, y2: number) => {
			return globalThis.Math.sqrt(globalThis.Math.pow(x2 - x1, 2) + globalThis.Math.pow(y2 - y1, 2));
		}
	},
	Between: (min: number, max: number) => {
		return globalThis.Math.floor(globalThis.Math.random() * (max - min + 1)) + min;
	},
	FloatBetween: (min: number, max: number) => {
		return globalThis.Math.random() * (max - min) + min;
	}
}

export class EventEmitter {
	on() { }
	emit() { }
	off() { }
	once() { }
}

export const Events = {
	EventEmitter: EventEmitter
}

export const Structs = {
	List: class List { }
}

const PhaserMock = {
	Math,
	Events,
	Structs
};

export default PhaserMock;
