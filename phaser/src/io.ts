import * as constants from "@Constants";
import * as Geometry from "@Models/Geometry";
import * as CrystalSelectionScene from "@Screens/CrystalSelection/CrystalSelectionScreen";
import * as TitleScreen from "@Screens/Title/TitleScreen";
import * as BattlegroundScreen from "@Screens/Battleground/BattlegroundScreen";
import * as animation from "@Utils/animation";
import * as OptionsScreen from "@Screens/Options/OptionsScreen";
import * as i18n_ from "@i18n/i18n";
import * as Controller_ from "@Core/GameController";
import events_ from "events";
import * as Models from "@Core/Models";
import * as Logger from "@Utils/Logger";
import * as Chara from "@Systems/Chara/Chara";

const logger = Logger.createLogger("io");

export let game: Phaser.Game;
export let scene: Phaser.Scene;

export const i18n = i18n_.t;

export const emitter = new events_();

export const Controller = Controller_;

export const createEvent = <T>(event: string): Models.Event<T> => {

	return {
		listen: (callback: (payload: T) => void) => {
			logger.debug(`~~~Listening to event: ${event}`);
			emitter.on(event, callback);
		},
		emit: (payload: T) => {
			logger.debug(`~~~Emitting event: ${event}`, payload);
			emitter.emit(event, payload);
		},
	};
}


export const screens = {
	title: TitleScreen,
	crystalSelection: CrystalSelectionScene.create,
	battleground: BattlegroundScreen,
	options: OptionsScreen.create
}

export const clean = () => {

	Chara.clearAll();
	scene.children.each(c => c.destroy())
	scene.children.removeAll();
	scene.tweens.killAll();
	scene.time.removeAllEvents();
}

export function initPhaserIO(newScene: Phaser.Scene) {
	scene = newScene;
	game = newScene.game;
}

export function BringToTop(obj: Phaser.GameObjects.GameObject): void {
	scene.children.bringToTop(obj);
}

export function MoveBelow(a: Phaser.GameObjects.GameObject, b: Phaser.GameObjects.GameObject): void {
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
export function Container(children?: (ContainerChild | null)[]): Phaser.GameObjects.Container {
	const container = scene.add.container();

	if (children) {
		const elements: Phaser.GameObjects.GameObject[] = [];

		children.forEach((child) => {
			if (!child) {
				return;
			} else if (typeof child === "function") {
				elements.push(child());
			} else if (Array.isArray(child)) {
				if (child.length === 0) {
					return;
				}

				const result = child.reduce<Phaser.GameObjects.GameObject>(
					(acc, fn) => fn(acc),
					container
				);

				if (result !== container) {
					elements.push(result);
				}
			} else {
				elements.push(child);
			}
		});
		container.add(elements);
	}

	return container;
}

export function Image(texture: string): Phaser.GameObjects.Image {
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

export const SetInteractiveRect = ([width, height]: Size) => (
	obj: Phaser.GameObjects.GameObject
) => {
	obj.setInteractive(Rect([0, 0], [width, height]), Phaser.Geom.Rectangle.Contains);
	return obj;
};

export function Rect([x, y]: Vec2, [w, h]: Size): Phaser.Geom.Rectangle {
	return new Phaser.Geom.Rectangle(x, y, w, h);
}

export function Tween(config: Phaser.Types.Tweens.TweenBuilderConfig): void {
	scene.tweens.add(config);
}

export function SetPosition(
	obj: Phaser.GameObjects.GameObject,
	[x, y]: Vec2
): Phaser.GameObjects.GameObject {
	(obj as unknown as Phaser.GameObjects.Components.Transform)
		.setPosition(x, y);
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
	[x, y]: [number, number],
	[w, h]: [number, number],
	cornerRadius: number = 10,
	color: number = 0xffa500,
	alpha: number = 0.7
): Phaser.GameObjects.Graphics {
	// origin
	const [ox, oy] = Geometry.sumVec2([x, y], [-w / 2, -h / 2]);
	const g = scene.add.graphics({ x: ox, y: oy });
	g.lineStyle(2, 0xffffff, 0.5);
	g.fillStyle(color, alpha);
	g.fillRoundedRect(0, 0, w, h, cornerRadius);
	g.strokeRoundedRect(0, 0, w, h, cornerRadius);

	return g;
}

export function Rectangle(
	[x, y]: [number, number],
	[w, h]: [number, number],
	color: number = 0xffa500,
	alpha: number = 0.7,
	stroke?: boolean
): Phaser.GameObjects.Graphics {
	// origin
	const [ox, oy] = Geometry.sumVec2([x, y], [-w / 2, -h / 2]);
	const g = scene.add.graphics({ x: ox, y: oy });
	g.lineStyle(4, 0xffffff, 0.8);
	g.fillStyle(color, alpha);
	g.fillRect(0, 0, w, h);

	if (stroke) g.strokeRect(0, 0, w, h);

	return g;
}

export function Circle(
	[x, y]: Vec2,
	radius: number,
	color: number = 0xffa500,
	alpha: number = 0.7
): Phaser.GameObjects.Graphics {
	const g = scene.add.graphics({ x, y });
	g.fillStyle(color, alpha);
	g.fillCircle(0, 0, radius);

	return g;
}

export function RectangularDropZone(name: string, [x, y]: Vec2, [width, height]: Size): Phaser.GameObjects.Zone {

	const zone = scene.add.zone(x, y, width, height);

	zone.setName(name);

	zone.setRectangleDropZone(width, height);

	return zone;
}

export function Centralize(obj: Phaser.GameObjects.GameObject): Phaser.GameObjects.GameObject {
	(obj as unknown as Phaser.GameObjects.Components.Origin).setOrigin(0.5);
	return obj;
}

export function Text(
	text: string,
	style = constants.defaultTextConfig): Phaser.GameObjects.Text {
	return scene.add.text(0, 0, text, style);
}

export function Title1(text: string) {
	return Text(text, constants.titleTextConfig)
}

export function Title2(text: string) {
	return Text(text, { ...constants.titleTextConfig, fontSize: "22px" })
}

export function Label(text: string) {
	return Text(text, constants.defaultTextConfig)
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
	[x, y]: Vec2,
	[w, h]: Size,
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
	const shader = scene.add.shader(base, x, y, w, h);
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

export const FadeOut = async (duration: number, color: number) =>
	new Promise<void>((resolve) => {
		const r = (color >> 16) & 0xff;
		const g = (color >> 8) & 0xff;
		const b = color & 0xff;
		scene.cameras.main.fade(duration, r, g, b);
		scene.cameras.main.once(
			Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
			resolve,
		);
	});

export const FadeIn = async (duration: number) =>
	new Promise<void>((resolve) => {
		scene.cameras.main.fadeIn(duration);
		scene.cameras.main.once(
			Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE,
			resolve,
		);
	});

export function StartScene(key: string, data?: object): void {
	scene.scene.start(key, data);
}

export function Delay(duration: number): Promise<void> {
	return animation.delay(duration);
}