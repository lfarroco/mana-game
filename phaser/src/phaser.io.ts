import { sumVec2 } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";
import Phaser from "phaser";

export function BringToTop(obj: Phaser.GameObjects.GameObject): void {
	const scene = getCurrentScene();
	scene.children.bringToTop(obj);
}

export function MoveBelow(a: Phaser.GameObjects.GameObject, b: Phaser.GameObjects.GameObject): void {
	const scene = getCurrentScene();
	scene.children.moveBelow(a, b);
}

type ContainerChild =
	| Phaser.GameObjects.GameObject
	| (() => Phaser.GameObjects.GameObject)
	| ((prev: Phaser.GameObjects.GameObject) => Phaser.GameObjects.GameObject)[];

/**
 * Creates a container with optional children. Children can be:
 * - GameObjects directly
 * - Functions that return GameObjects
 * - Arrays of functions that compose together (each function receives the previous result)
 */
export function Container(children?: ContainerChild[]): Phaser.GameObjects.Container {
	const scene = getCurrentScene();
	const container = scene.add.container();

	if (children) {
		const elements: Phaser.GameObjects.GameObject[] = [];

		children.forEach((child) => {
			if (typeof child === "function") {
				elements.push(child());
			} else if (Array.isArray(child)) {
				const result = child.reduce<Phaser.GameObjects.GameObject>(
					(acc, fn) => fn(acc),
					container
				);
				elements.push(result);
			} else {
				elements.push(child);
			}
		});
		container.add(elements);
	}

	return container;
}

export function Image(texture: string): Phaser.GameObjects.Image {
	const scene = getCurrentScene();
	return scene.add.image(0, 0, texture);
}

export function GetByName(container: Phaser.GameObjects.Container, name: string): Phaser.GameObjects.GameObject | null {
	return container.getByName(name);
}

export function SetText(obj: Phaser.GameObjects.Text, text: string): void {
	obj.setText(text);
}
export function AddChildren(
	container: Phaser.GameObjects.Container,
	children: Phaser.GameObjects.GameObject[]
): void {
	container.add(children);
}
export function SetName(obj: Phaser.GameObjects.GameObject, name: string): void {
	obj.setName(name);
}

export const SetInteractiveRect = (size: Size) => (obj: Phaser.GameObjects.GameObject) => {
	obj.setInteractive(Rect({ x: 0, y: 0 }, size), Phaser.Geom.Rectangle.Contains);
	return obj;
};

export function Rect(position: Vec2, size: Size): Phaser.Geom.Rectangle {
	return new Phaser.Geom.Rectangle(position.x, position.y, size.width, size.height);
}

export function Tween(config: Phaser.Types.Tweens.TweenBuilderConfig): void {
	const scene = getCurrentScene();
	scene.tweens.add(config);
}

export function SetPosition(
	obj: Phaser.GameObjects.GameObject,
	vec: Vec2
): Phaser.GameObjects.GameObject {
	(obj as unknown as Phaser.GameObjects.Components.Transform).setPosition(vec.x, vec.y);
	return obj;
}

export function SetAlpha(obj: { setAlpha: (n: number) => void }, n: number): void {
	obj.setAlpha(n);
}

export function SetVisible(obj: { setVisible: (visible: boolean) => void }, visible: boolean): void {
	obj.setVisible(visible);
}

export function Show(obj: { setVisible: (visible: boolean) => void }): void {
	obj.setVisible(true);
}

export function Hide(obj: { setVisible: (visible: boolean) => void }): void {
	obj.setVisible(false);
}

export function Destroy(obj: Phaser.GameObjects.GameObject): void {
	obj.destroy(true);
}
export function BorderedRoundRect(
	position: Vec2,
	size: Size,
	cornerRadius: number = 10,
	color: number = 0xffa500,
	alpha: number = 0.7
): Phaser.GameObjects.Graphics {
	const scene = getCurrentScene();
	const actualPos = sumVec2(position, { x: -size.width / 2, y: -size.height / 2 });
	const g = scene.add.graphics(actualPos);
	g.lineStyle(2, 0xffffff, 0.5);
	g.fillStyle(color, alpha);
	g.fillRoundedRect(0, 0, size.width, size.height, cornerRadius);
	g.strokeRoundedRect(0, 0, size.width, size.height, cornerRadius);

	return g;
}

export function Rectangle(
	position: Vec2,
	size: Size,
	color: number = 0xffa500,
	alpha: number = 0.7,
	stroke?: boolean
): Phaser.GameObjects.Graphics {
	const scene = getCurrentScene();
	const actualPos = sumVec2(position, { x: -size.width / 2, y: -size.height / 2 });
	const g = scene.add.graphics(actualPos);
	g.lineStyle(4, 0xffffff, 0.8);
	g.fillStyle(color, alpha);
	g.fillRect(0, 0, size.width, size.height);

	if (stroke) g.strokeRect(0, 0, size.width, size.height);

	return g;
}

export function Circle(
	position: Vec2,
	radius: number,
	color: number = 0xffa500,
	alpha: number = 0.7
): Phaser.GameObjects.Graphics {
	const scene = getCurrentScene();
	const g = scene.add.graphics({ x: position.x, y: position.y });
	g.fillStyle(color, alpha);
	g.fillCircle(0, 0, radius);

	return g;
}

export function RectangularDropZone(name: string, { x, y }: Vec2, { width, height }: Size): Phaser.GameObjects.Zone {
	const scene = getCurrentScene();

	const zone = scene.add.zone(x, y, width, height);

	zone.setName(name);

	zone.setRectangleDropZone(width, height);

	return zone;
}

export function Centralize(obj: Phaser.GameObjects.GameObject): Phaser.GameObjects.GameObject {
	(obj as unknown as Phaser.GameObjects.Components.Origin).setOrigin(0.5);
	return obj;
}

export function Text(text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
	const scene = getCurrentScene();
	return scene.add.text(0, 0, text, style);
}

export function SetStyle(
	obj: Phaser.GameObjects.Text,
	style: Phaser.Types.GameObjects.Text.TextStyle
): void {
	obj.setStyle(style);
}

export function WhenDroppedOnZone(
	obj: Phaser.GameObjects.GameObject,
	target: string,
	callback: (zone: Phaser.GameObjects.Zone) => void
): void {
	obj.on(Phaser.Input.Events.DROP, (_: Pointer, actual: Phaser.GameObjects.Zone) => {
		if (target === actual.name) {
			callback(actual);
		}
	});
}

export function OnPointerDown(obj: Phaser.GameObjects.GameObject, callback: () => void): void {
	obj.on(Phaser.Input.Events.POINTER_DOWN, callback);
}

export function OnPointerUp(obj: Phaser.GameObjects.GameObject, callback: () => void): void {
	obj.on(Phaser.Input.Events.POINTER_UP, callback);
}

export function OnPointerOver(obj: Phaser.GameObjects.GameObject, callback: () => void): void {
	obj.on(Phaser.Input.Events.POINTER_OVER, callback);
}

export function OnPointerOut(obj: Phaser.GameObjects.GameObject, callback: () => void): void {
	obj.on(Phaser.Input.Events.POINTER_OUT, callback);
}

export function OnceDestroyed(obj: Phaser.GameObjects.GameObject, callback: () => void): void {
	obj.once("destroy", callback);
}

/**
 * Registers an update callback that runs every frame.
 * Automatically cleans up when the object is destroyed.
 */
export function OnUpdate(
	obj: Phaser.GameObjects.GameObject,
	callback: (time: number, delta: number) => void
): void {
	const scene = getCurrentScene();
	scene.events.on(Phaser.Scenes.Events.UPDATE, callback);

	OnceDestroyed(obj, () => {
		scene.events.off(Phaser.Scenes.Events.UPDATE, callback);
	});
}

type ShaderUniformValue =
	| { x: number; y: number; z: number }
	| { x: number; y: number }
	| number;

type ShaderUniform = {
	type: "1f" | "2f" | "3f";
	value: ShaderUniformValue;
};

export function Shader(
	frag: string,
	position: Vec2,
	size: Size,
	uniforms: (
		| {
			key: string;
			type: "1f";
			value: number;
		}
		| {
			key: string;
			type: "2f";
			value: [number, number];
		}
		| {
			key: string;
			type: "3f";
			value: [number, number, number];
		}
	)[]
): Phaser.GameObjects.Shader {
	const scene = getCurrentScene();
	const { x, y } = position;
	const { width, height } = size;

	const shaderUniforms: Record<string, ShaderUniform> = {};
	uniforms.forEach((uniform) => {
		shaderUniforms[uniform.key] = {
			type: uniform.type,
			value:
				uniform.type === "3f"
					? { x: uniform.value[0], y: uniform.value[1], z: uniform.value[2] }
					: uniform.type === "2f"
						? { x: uniform.value[0], y: uniform.value[1] }
						: uniform.value,
		};
	});

	const base = new Phaser.Display.BaseShader("magic-button", frag, undefined, shaderUniforms);
	const shader = scene.add.shader(base, x, y, width, height);
	return shader;
}

export function DisableInteractive(obj: Phaser.GameObjects.GameObject): void {
	obj.disableInteractive();
}

export function SetUniform(shader: Phaser.GameObjects.Shader, key: string, value: number): void {
	shader.setUniform(key, value);
}

export function SetColor(text: Phaser.GameObjects.Text, color: string): void {
	text.setColor(color);
}

export function SetStroke(text: Phaser.GameObjects.Text, color: string, thickness: number): void {
	text.setStroke(color, thickness);
}

export async function Fade(duration: number, color: number) {
	return new Promise<void>((resolve) => {
		const scene = getCurrentScene();

		const r = (color >> 16) & 0xff;
		const g = (color >> 8) & 0xff;
		const b = color & 0xff;
		scene.cameras.main.fade(duration, r, g, b);
		scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, resolve);
	});
}

export function StartScene(key: string): void {
	const scene = getCurrentScene();
	scene.scene.start(key);
}
