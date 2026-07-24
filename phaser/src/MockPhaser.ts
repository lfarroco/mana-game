export class Vector2 {
	x: number;
	y: number;
	constructor(x: number = 0, y: number = 0) {
		this.x = x;
		this.y = y;
	}
	set(x: number, y: number) {
		this.x = x;
		this.y = y;
		return this;
	}
	clone() {
		return new Vector2(this.x, this.y);
	}
	normalize() {
		const len = globalThis.Math.sqrt(this.x * this.x + this.y * this.y) || 1;
		this.x /= len;
		this.y /= len;
		return this;
	}
	add(v: Vector2) {
		this.x += v.x;
		this.y += v.y;
		return this;
	}
	scale(n: number) {
		this.x *= n;
		this.y *= n;
		return this;
	}
}

export const Math = {
	Vector2: Vector2,
	Distance: {
		Between: (x1: number, y1: number, x2: number, y2: number) => {
			return globalThis.Math.sqrt(
				globalThis.Math.pow(x2 - x1, 2) + globalThis.Math.pow(y2 - y1, 2)
			);
		},
		BetweenPoints: (a: { x: number; y: number }, b: { x: number; y: number }) => {
			return globalThis.Math.sqrt(
				globalThis.Math.pow(b.x - a.x, 2) + globalThis.Math.pow(b.y - a.y, 2)
			);
		},
	},
	Angle: {
		BetweenPoints: (a: { x: number; y: number }, b: { x: number; y: number }) => {
			return globalThis.Math.atan2(b.y - a.y, b.x - a.x);
		},
		Between: (x1: number, y1: number, x2: number, y2: number) => {
			return globalThis.Math.atan2(y2 - y1, x2 - x1);
		},
		RadToDeg: (radians: number) => radians * (180 / globalThis.Math.PI),
	},
	Between: (min: number, max: number) => {
		return globalThis.Math.floor(globalThis.Math.random() * (max - min + 1)) + min;
	},
	FloatBetween: (min: number, max: number) => {
		return globalThis.Math.random() * (max - min) + min;
	},
};

export class EventEmitter {
	on() { }
	emit() { }
	off() { }
	once() { }
}

export const Events = {
	EventEmitter: EventEmitter,
};

export const Structs = {
	List: class List { },
};

type MockGraphicsFactory = {
	fillStyle: () => void;
	fillRect: () => void;
	generateTexture: () => void;
	destroy: () => void;
};

type MockSceneAddApi = Record<string, unknown>;
type MockSceneTimeApi = Record<string, unknown>;
type MockSceneEventsApi = { once: () => void };
type MockSceneTweensApi = { add: () => void };
type MockSceneMakeApi = { graphics: () => MockGraphicsFactory };
type MockSceneTexturesApi = { exists: () => boolean };

export class Scene {
	add: MockSceneAddApi = {};
	time: MockSceneTimeApi = {};
	events: MockSceneEventsApi = { once() { } };
	tweens: MockSceneTweensApi = { add() { } };
	make: MockSceneMakeApi = {
		graphics() {
			return {
				fillStyle() { },
				fillRect() { },
				generateTexture() { },
				destroy() { },
			};
		},
	};
	textures: MockSceneTexturesApi = {
		exists() {
			return true;
		},
	};
}

export const Scenes = {
	Events: {
		SHUTDOWN: "shutdown",
	},
};

export const Display = {
	BaseShader: class BaseShader {
		constructor(..._args: unknown[]) { }
	},
};

export const Cameras = {
	Scene2D: {
		Camera: class Camera { },
	},
};

export const Input = {
	Keyboard: {
		KeyCodes: {},
	},
};

export const Plugins = {
	BasePlugin: class BasePlugin {
		constructor(..._args: unknown[]) { }
	},
};

class Graphics {
	constructor(..._args: unknown[]) { }
	clear() {
		return this;
	}
	lineStyle(..._args: unknown[]) {
		return this;
	}
	beginPath() {
		return this;
	}
	moveTo(..._args: unknown[]) {
		return this;
	}
	lineTo(..._args: unknown[]) {
		return this;
	}
	strokePath() {
		return this;
	}
	setBlendMode(..._args: unknown[]) {
		return this;
	}
	setVisible(..._args: unknown[]) {
		return this;
	}
	destroy() { }
}

export const GameObjects = {
	Graphics,
};

export const Geom = {
	Circle: class Circle {
		constructor(
			public x: number,
			public y: number,
			public radius: number
		) { }
	},
};

export const BlendModes = {
	ADD: "ADD",
	NORMAL: "NORMAL",
};

export const Curves = {
	Path: class Path {
		constructor(..._args: unknown[]) { }
		lineTo(..._args: unknown[]) {
			return this;
		}
	},
};

export const Renderer = {
	WebGL: {
		Utils: {},
	},
};

export const Utils = {
	Objects: {
		GetValue: (..._args: unknown[]) => undefined,
		GetAdvancedValue: (..._args: unknown[]) => undefined,
		GetFastValue: (..._args: unknown[]) => undefined,
		IsPlainObject: (_obj: unknown) => false,
	},
	String: {
		Pad: (str: unknown) => String(str),
		UUID: () => "",
	},
};

export const Scale = {
	FIT: 3,
	CENTER_BOTH: 1,
	NO_CENTER: 0,
	SCALE_MODES: {},
};

export const DOM = {
	AddToDOM: (..._args: unknown[]) => { },
	RemoveFromDOM: (..._args: unknown[]) => { },
};

export const Textures = {
	DynamicTexture: class DynamicTexture {
		constructor(..._args: unknown[]) { }
	},
};

export const VERSION = "3.60.0";

export const Class = {
	mixin: (..._args: unknown[]) => { },
};

const PhaserMock = {
	Math,
	Events,
	Structs,
	Scene,
	Scenes,
	Display,
	Cameras,
	Input,
	Plugins,
	GameObjects,
	Geom,
	BlendModes,
	Curves,
	Renderer,
	Utils,
	Scale,
	DOM,
	Textures,
	VERSION,
	Class,
};

// Some modules reference global `Phaser` directly instead of importing it.
// Expose the same mock globally so those references are safe in edge runtime.
if (!(globalThis as { Phaser?: unknown }).Phaser) {
	(globalThis as { Phaser?: unknown }).Phaser = PhaserMock;
}

export default PhaserMock;
