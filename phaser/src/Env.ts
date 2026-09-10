/**
 * Env — The application environment for the client UI layer.
 *
 * A module-scoped singleton set once at startup by `createEnv()`.
 * Import it in any module: `import { env } from "./Env"`.
 * Guaranteed to exist whenever any scene code runs (no null checks needed).
 *
 * `env.scene` is the *active* screen scene; it is repointed on every screen
 * entry by `ScreenScene.create()` (see Scenes/ScreenScene.ts) because the game
 * runs one Phaser scene per screen.
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
import { initialState } from "@Models/ClientState";
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

export {
	container as makeContainer,
	borderedRoundRect,
	centeredRect,
	rectangularDropZone,
	shader as makeShader,
	whenDroppedOnZone,
} from "./phaser-helpers";

// ---------------------------------------------------------------------------
// Event channel
// ---------------------------------------------------------------------------

export type EventChannel<T> = Models.Event<T>;

const createChannel = <T>(emitter: EventEmitter, event: string): EventChannel<T> => ({
	listen: (cb) => {
		emitter.on(event, cb);
		return () => {
			emitter.off(event, cb);
		};
	},
	emit: async (payload) => {
		emitter.emit(event, payload);
	},
	clear: () => {
		emitter.removeAllListeners(event);
	},
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

/**
 * Time helpers read the *live* active scene, not the scene env was created
 * with. Under one-scene-per-screen navigation `env.scene` is repointed on
 * every screen entry, so a captured scene reference would schedule timers on
 * a scene that has already shut down.
 */
const makeTime = (getScene: () => Phaser.Scene): Time => ({
	delay: (ms) =>
		new Promise<void>((resolve) => {
			getScene().time.addEvent({ delay: ms, callback: () => resolve() });
		}),
	get delta() {
		return getScene().game.loop.delta;
	},
	get scale() {
		return getScene().time.timeScale;
	},
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
// Env
// ---------------------------------------------------------------------------

export type Env = {
	/**
	 * The scene currently rendering the UI. Under one-scene-per-screen
	 * navigation this is repointed by each screen scene's `create()` (see
	 * `Scenes/ScreenScene.ts`); it is NOT a single permanent scene.
	 */
	scene: Phaser.Scene;

	/** Current client state snapshot (read-only — mutate only via resetState/patchState/updateState). */
	state: Readonly<ClientState>;
	/** Replace the entire state with a fresh initialState(). */
	resetState: () => void;
	/** Shallow-merge a partial state into the current state. */
	patchState: (partial: Partial<ClientState>) => void;
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

	// -----------------------------------------------------------------------
	// Phaser helpers (composables, not wrappers)
	// -----------------------------------------------------------------------

	/** Create a container with optional children (lazy thunks, composable chains). */
	container: (
		children?: (
			| Phaser.GameObjects.GameObject
			| (() => Phaser.GameObjects.GameObject)
			| ((prev: Phaser.GameObjects.GameObject) => Phaser.GameObjects.GameObject)[]
			| null
		)[]
	) => Phaser.GameObjects.Container;

	/** Draw a centered rounded rectangle with fill and border. */
	borderedRoundRect: (
		pos: [number, number],
		size: [number, number],
		cornerRadius?: number,
		color?: number,
		alpha?: number
	) => Phaser.GameObjects.Graphics;

	/** Draw a centered rectangle with optional stroke. */
	centeredRect: (
		pos: [number, number],
		size: [number, number],
		color?: number,
		alpha?: number,
		stroke?: boolean
	) => Phaser.GameObjects.Graphics;

	/** Creates a named drop zone. */
	rectangularDropZone: (name: string, pos: Vec2, size: Size) => Phaser.GameObjects.Zone;

	/** Creates a shader with tuple-style uniforms. */
	shader: (
		frag: string,
		pos: Vec2,
		size: Size,
		uniforms: (
			| { key: string; type: "1f"; value: number }
			| { key: string; type: "2f"; value: [number, number] }
			| { key: string; type: "3f"; value: [number, number, number] }
		)[]
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

/**
 * Extra time allowed on top of a fade's duration before it resolves anyway.
 */
const FADE_TIMEOUT_SLACK_MS = 250;

/**
 * Build a one-shot resolver for a camera fade. It is called by the camera's
 * completion event, but also by a bounded timer — a fade interrupted by a
 * scene restart may never emit its completion, and an awaiting caller must not
 * stall forever (the reported screen-transition bug).
 */
function boundedFade(resolve: () => void, duration: number): () => void {
	let settled = false;
	const finish = () => {
		if (settled) return;
		settled = true;
		clearTimeout(timeout);
		resolve();
	};
	const timeout = setTimeout(finish, duration + FADE_TIMEOUT_SLACK_MS);
	return finish;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createEnv = (
	scene: Phaser.Scene,
	state: ClientState,
	dispatch: (action: Models.Action) => Promise<Models.ActionResponse>
): Env => {
	const emitter = new EventEmitter();
	const cell = { current: Object.freeze(state) };

	const instance: Env = {
		scene,

		get state() {
			return cell.current;
		},
		resetState() {
			cell.current = Object.freeze(initialState());
		},
		patchState(partial) {
			cell.current = Object.freeze({ ...cell.current, ...partial });
		},
		updateState(next) {
			cell.current = Object.freeze(next);
		},

		dispatch,

		time: makeTime(() => instance.scene),
		audio: makeAudio(),

		createEventChannel<T>(event: string): EventChannel<T> {
			return createChannel<T>(emitter, event);
		},

		// Phaser helpers bound to *the live scene* — not the scene env was
		// created with (see the Env.scene docs). `container` already reads the
		// live env.scene inside phaser-helpers.
		container: (children) => makeContainer(children),
		borderedRoundRect: (pos, size, cornerRadius, color, alpha) =>
			borderedRoundRect(instance.scene, pos, size, cornerRadius, color, alpha),
		centeredRect: (pos, size, color, alpha, stroke) =>
			centeredRect(instance.scene, pos, size, color, alpha, stroke),
		rectangularDropZone: (name, pos, size) => rectangularDropZone(instance.scene, name, pos, size),
		shader: (frag, pos, size, uniforms) => makeShader(instance.scene, frag, pos, size, uniforms),

		fadeOut: async (duration, color) =>
			new Promise<void>((resolve) => {
				const camera = instance.scene.cameras.main;
				const r = (color >> 16) & 0xff;
				const g = (color >> 8) & 0xff;
				const b = color & 0xff;
				// Hang-proof: a fade interrupted by a scene restart may never
				// emit its completion event, and a caller awaiting the camera
				// would stall forever (the reported screen-transition bug).
				const finish = boundedFade(resolve, duration);
				camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, finish);
				camera.fade(duration, r, g, b);
			}),

		fadeIn: async (duration) =>
			new Promise<void>((resolve) => {
				const camera = instance.scene.cameras.main;
				const finish = boundedFade(resolve, duration);
				camera.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, finish);
				camera.fadeIn(duration);
			}),
	};

	env = instance;

	if (__DEV__) {
		//@ts-expect-error expose env
		window.__env__ = instance;
		//env.scene.cameras.main.zoom = 0.2
	}

	return instance;
};

/**
 * Point `env.scene` at the scene that is now rendering the UI. Called by
 * `ScreenScene.create()` on every screen entry; navigation between screens is
 * one-scene-per-screen, so all `env.scene` consumers follow the active screen.
 */
export function setActiveScene(scene: Phaser.Scene): void {
	env.scene = scene;
}
