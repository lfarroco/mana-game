import { sumVec2 } from "@Models/Geometry";
import { getState } from "@Models/State";
import Phaser from "phaser";

export function BringToTop(obj: Phaser.GameObjects.GameObject) {
	const scene = getState().currentScene;
	scene.children.bringToTop(obj);
}

export function Container() {
	const scene = getState().currentScene;
	return scene.add.container();
}

export function GetByName(container: Phaser.GameObjects.Container, name: string) {
	return container.getByName(name);
}

export function SetText(obj: Phaser.GameObjects.Text, text: string) {
	obj.setText(text);
}
export function AddChildren(container: Phaser.GameObjects.Container, children: Phaser.GameObjects.GameObject[]) {
	container.add(children)
}
export function SetName(obj: Phaser.GameObjects.GameObject, name: string) {
	obj.setName(name);
}

export function SetInteractiveRect(obj: Phaser.GameObjects.GameObject, size: Dimension) {
	obj.setInteractive(Rect({ x: 0, y: 0 }, size), Phaser.Geom.Rectangle.Contains);
}

export function Rect(position: Vec2, size: Dimension) {
	return new Phaser.Geom.Rectangle(position.x, position.y, size.width, size.height);
}

export function Tween(config: Phaser.Types.Tweens.TweenBuilderConfig) {
	const scene = getState().currentScene;
	scene.tweens.add(config);
}

export function SetPosition(obj: { setPosition: (x: number, y: number) => void }, vec: Vec2) {
	obj.setPosition(vec.x, vec.y);
}

export function SetAlpha(obj: { setAlpha: (n: number) => void }, n: number) {
	obj.setAlpha(n);
}

export function SetVisible(obj: { setVisible: (visible: boolean) => void }, visible: boolean) {
	obj.setVisible(visible);
}

export function Show(obj: { setVisible: (visible: boolean) => void }) {
	obj.setVisible(true);
}

export function Hide(obj: { setVisible: (visible: boolean) => void }) {
	obj.setVisible(false);
}

export function Destroy(obj: Phaser.GameObjects.GameObject) {
	obj.destroy(true);
}
export function BorderedRoundRect(
	position: Vec2,
	size: Dimension,
	cornerRadius: number = 10,
	color: number = 0xffa500,
	alpha: number = 0.7,
) {
	const scene = getState().currentScene;
	const actualPos = sumVec2(position, { x: -size.width / 2, y: -size.height / 2 })
	const g = scene.add.graphics(actualPos);
	g.lineStyle(4, 0xffffff, 0.8);
	g.fillStyle(color, alpha);
	g.fillRoundedRect(0, 0, size.width, size.height, cornerRadius);
	g.strokeRoundedRect(0, 0, size.width, size.height, cornerRadius);

	return g;
}

export function RectangularDropZone(
	name: string,
	{ x, y }: Vec2,
	{ width, height }: Dimension,
) {
	const scene = getState().currentScene;

	const zone = scene.add.zone(
		x, y,
		width, height
	);

	zone.setName(name);

	zone.setRectangleDropZone(width, height);

	return zone;
}

export function Centralize(obj: {
	setOrigin: (n: number) => void
}) {
	obj.setOrigin(0.5);
}

export function Text(
	position: Vec2,
	text: string,
	style: Phaser.Types.GameObjects.Text.TextStyle
) {
	const scene = getState().currentScene;
	return scene.add.text(position.x, position.y, text, style);
}

export function WhenDroppedOnZone(
	obj: Phaser.GameObjects.GameObject,
	target: string,
	callback: (zone: Phaser.GameObjects.Zone) => void
) {
	obj.on(
		Phaser.Input.Events.DROP,
		(_: Pointer, actual: Phaser.GameObjects.Zone) => {
			if (target === actual.name) {
				callback(actual);
			}
		}
	);
}

//buttonGraphics.on(Phaser.Input.Events.POINTER_DOWN, () => {
export function OnPointerDown(obj: Phaser.GameObjects.GameObject, callback: () => void) {
	obj.on(Phaser.Input.Events.POINTER_DOWN, callback);
}

export function OnPointerUp(obj: Phaser.GameObjects.GameObject, callback: () => void) {
	obj.on(Phaser.Input.Events.POINTER_UP, callback);
}

export function OnPointerOver(obj: Phaser.GameObjects.GameObject, callback: () => void) {
	obj.on(Phaser.Input.Events.POINTER_OVER, callback);
}

export function OnPointerOut(obj: Phaser.GameObjects.GameObject, callback: () => void) {
	obj.on(Phaser.Input.Events.POINTER_OUT, callback);
}

export function OnDestroy(obj: Phaser.GameObjects.GameObject, callback: () => void) {
	obj.on("destroy", callback)
}

export function OnUpdate(obj: Phaser.GameObjects.GameObject, callback: (time: number, delta: number) => void) {
	const scene = getState().currentScene;
	scene.events.on(Phaser.Scenes.Events.UPDATE, callback);

	obj.once("destroy", () => {
		scene.events.off(Phaser.Scenes.Events.UPDATE, callback);
	})
}
export function Shader(
	frag: string,
	position: Vec2,
	size: Dimension,
	uniforms: ({
		key: string;
		type: '1f';
		value: number;
	} | {
		key: string;
		type: '2f';
		value: [number, number];
	} | {
		key: string;
		type: '3f';
		value: [number, number, number];
	})[]
): Phaser.GameObjects.Shader {

	const scene = getState().currentScene;
	const { x, y } = position;
	const { width, height } = size;

	let shaderUniforms = {} as any
	uniforms.forEach(uniform => {
		shaderUniforms[uniform.key] = {
			type: uniform.type,
			value: uniform.value
		}
	})

	const base = new Phaser.Display.BaseShader(
		"magic-button",
		frag,
		undefined,
		shaderUniforms
	);
	const shader = scene.add.shader(base, x, y, width, height);
	return shader;
}

export function SetUniform(shader: Phaser.GameObjects.Shader, key: string, value: number) {
	shader.setUniform(key, value);
}