/**
 * Env — The application environment for the client UI layer.
 *
 * A module-scoped singleton set once at startup by `createEnv()`.
 * Import it in any module: `import { env } from "./Env"`.
 * Guaranteed to exist whenever any scene code runs (no null checks needed).
 *
 * env.scene gives direct Phaser API access — no wrapper layer to learn.
 * env.time, env.audio, and env.createEventChannel add value that Phaser lacks
 * (Promise-based timing, unified audio, typed events).
 *
 * See ENV_MIGRATION_PLAN.md for the full migration roadmap.
 */

import * as Models from "@game/Models";
import * as AudioManager from "@Systems/AudioManager";
import { ClientState } from "@Models/ClientState";
import {
	container as makeContainer,
	borderedRoundRect,
	centeredRect,
	rectangularDropZone,
	shader as makeShader,
} from "./phaser-helpers";
import EventEmitter from "events";

// ---------------------------------------------------------------------------
// Re-export phaser-helpers for convenience
// ---------------------------------------------------------------------------

export { container as makeContainer, borderedRoundRect, centeredRect, rectangularDropZone, shader as makeShader, whenDroppedOnZone } from "./phaser-helpers";

// ---------------------------------------------------------------------------
// Event channel
// ---------------------------------------------------------------------------

export type EventChannel<T> = Models.Event<T>;

const createChannel = <T>(emitter: EventEmitter, event: string): EventChannel<T> => ({
	listen: (cb) => {
		emitter.on(event, cb);
		return () => { emitter.off(event, cb); };
	},
	emit: async (payload) => { emitter.emit(event, payload); },
	clear: () => { emitter.removeAllListeners(event); },
});

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

type Time = {
	/** Promise-based delay (await env.time.delay(200)) */
	delay: (ms: number) => Promise<void>;
	/** Current frame delta in ms */
	delta: number;
	/** Time scale for pause/speed control (1 = normal) */
	scale: number;
};

const makeTime = (scene: Phaser.Scene): Time => ({
	delay: (ms) => new Promise<void>((resolve) => {
		scene.time.addEvent({ delay: ms, callback: () => resolve() });
	}),
	get delta() { return scene.game.loop.delta; },
	get scale() { return scene.time.timeScale; },
});

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

type Audio = {
	sfx: (key: string, volume?: number) => void;
	music: (key: string, loop?: boolean, fadeIn?: number) => void;
	stopMusic: (fadeOut?: number) => void;
	stopAllSfx: () => void;
	refreshVolumes: () => void;
};

const makeAudio = (): Audio => ({
	sfx: (key, volume) => AudioManager.playSoundEffect(key, volume),
	music: (key, loop, fadeIn) => AudioManager.playMusic(key, loop, fadeIn),
	stopMusic: (fadeOut) => AudioManager.stopMusic(fadeOut),
	stopAllSfx: () => AudioManager.stopAllSoundEffects(),
	refreshVolumes: () => AudioManager.onOptionsChanged(),
});

// ---------------------------------------------------------------------------
// Screen registry
// ---------------------------------------------------------------------------

export type ScreenRegistry = {
	navigateToTitle: () => Promise<void>;
	navigateToBattleground: (state: ClientState) => Promise<void>;
	navigateToOptions: () => Promise<void>;
	navigateToCrystalSelection: () => Promise<void>;
};

const noopScreens: ScreenRegistry = {
	navigateToTitle: async () => { },
	navigateToBattleground: async () => { },
	navigateToOptions: async () => { },
	navigateToCrystalSelection: async () => { },
};

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

export type Env = {
	/** Direct Phaser scene access (single scene, no wrapper needed). */
	scene: Phaser.Scene;

	/** Current client state snapshot. Mutate only via updateState. */
	state: ClientState;
	// idea: refactor to use state=>state signature, allowing the updates 
	// to do {...state, prop: val}
	updateState: (next: ClientState) => void;

	/** Dispatch a game action through the server adapter. */
	dispatch: (action: Models.Action) => Promise<Models.ActionResponse>;

	// TODO: what this comment means?
	/** Promise-based timing (Phaser is callback-based). */
	time: Time;

	/** Unified audio (absorbs AudioManager). */
	audio: Audio;

	/** Create a typed event channel. */
	createEventChannel: <T>(event: string) => EventChannel<T>;

	/** Screen transitions. */
	screens: ScreenRegistry;

	// -----------------------------------------------------------------------
	// Phaser helpers (composables, not wrappers)
	// -----------------------------------------------------------------------

	/** Create a container with optional children (lazy thunks, composable chains). */
	container: (children?: (
		| Phaser.GameObjects.GameObject
		| (() => Phaser.GameObjects.GameObject)
		| ((prev: Phaser.GameObjects.GameObject) => Phaser.GameObjects.GameObject)[]
		| null
	)[]) => Phaser.GameObjects.Container;

	/** Draw a centered rounded rectangle with fill and border. */
	borderedRoundRect: (
		pos: [number, number],
		size: [number, number],
		cornerRadius?: number,
		color?: number,
		alpha?: number,
	) => Phaser.GameObjects.Graphics;

	/** Draw a centered rectangle with optional stroke. */
	centeredRect: (
		pos: [number, number],
		size: [number, number],
		color?: number,
		alpha?: number,
		stroke?: boolean,
	) => Phaser.GameObjects.Graphics;

	/** Creates a named drop zone. */
	rectangularDropZone: (
		name: string,
		pos: Vec2,
		size: Size,
	) => Phaser.GameObjects.Zone;

	/** Creates a shader with tuple-style uniforms. */
	shader: (
		frag: string,
		pos: Vec2,
		size: Size,
		uniforms: (
			| { key: string; type: "1f"; value: number }
			| { key: string; type: "2f"; value: [number, number] }
			| { key: string; type: "3f"; value: [number, number, number] }
		)[],
	) => Phaser.GameObjects.Shader;

	/** Fade the main camera out. Returns a promise that resolves on completion. */
	fadeOut: (duration: number, color: number) => Promise<void>;

	/** Fade the main camera in. Returns a promise that resolves on completion. */
	fadeIn: (duration: number) => Promise<void>;
};

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export let env: Env;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createEnv = (
	scene: Phaser.Scene,
	state: ClientState,
	dispatch: (action: Models.Action) => Promise<Models.ActionResponse>,
	screenRegistry?: ScreenRegistry,
): Env => {
	const emitter = new EventEmitter();
	const cell = { current: state };

	const instance: Env = {
		scene,

		get state() { return cell.current; },
		updateState(next) { cell.current = next; },

		dispatch,

		time: makeTime(scene),
		audio: makeAudio(),

		createEventChannel<T>(event: string): EventChannel<T> {
			return createChannel<T>(emitter, event);
		},

		screens: screenRegistry ?? noopScreens,

		// Phaser helpers bound to this scene
		container: (children) => makeContainer(scene, children),
		borderedRoundRect: (pos, size, cornerRadius, color, alpha) =>
			borderedRoundRect(scene, pos, size, cornerRadius, color, alpha),
		centeredRect: (pos, size, color, alpha, stroke) =>
			centeredRect(scene, pos, size, color, alpha, stroke),
		rectangularDropZone: (name, pos, size) =>
			rectangularDropZone(scene, name, pos, size),
		shader: (frag, pos, size, uniforms) =>
			makeShader(scene, frag, pos, size, uniforms),

		fadeOut: async (duration, color) =>
			new Promise<void>((resolve) => {
				const r = (color >> 16) & 0xff;
				const g = (color >> 8) & 0xff;
				const b = color & 0xff;
				scene.cameras.main.fade(duration, r, g, b);
				scene.cameras.main.once(
					Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
					resolve,
				);
			}),

		fadeIn: async (duration) =>
			new Promise<void>((resolve) => {
				scene.cameras.main.fadeIn(duration);
				scene.cameras.main.once(
					Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE,
					resolve,
				);
			}),
	};

	env = instance;
	return instance;
};
