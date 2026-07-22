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

import { ClientState } from "@Models/ClientState";
import * as Models from "@game/Models";
import * as AudioManager from "@Systems/AudioManager";
import EventEmitter from "events";

// ---------------------------------------------------------------------------
// Event channel
// ---------------------------------------------------------------------------

export type EventChannel<T> = Models.Event<T>;

const createChannel = <T>(emitter: EventEmitter, event: string): EventChannel<T> => ({
  listen: (cb) => { emitter.on(event, cb); },
  emit: (payload) => { emitter.emit(event, payload); },
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
  navigateToTitle: async () => {},
  navigateToBattleground: async () => {},
  navigateToOptions: async () => {},
  navigateToCrystalSelection: async () => {},
};

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

export type Env = {
  /** Direct Phaser scene access (single scene, no wrapper needed). */
  scene: Phaser.Scene;

  /** Current client state snapshot. Mutate only via updateState. */
  state: ClientState;
  updateState: (next: ClientState) => void;

  /** Dispatch a game action through the server adapter. */
  dispatch: (action: Models.Action) => Promise<Models.ActionResponse>;

  /** Promise-based timing (Phaser is callback-based). */
  time: Time;

  /** Unified audio (absorbs AudioManager). */
  audio: Audio;

  /** Create a typed event channel. */
  createEventChannel: <T>(event: string) => EventChannel<T>;

  /** Screen transitions (populated during migration). */
  screens: ScreenRegistry;
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

    screens: noopScreens,
  };

  env = instance;
  return instance;
};
