/**
 * Env — The explicit environment passed through the client UI layer.
 *
 * Replaces the global `window.io` singleton with a typed record that carries:
 * - Pure state (ClientState)
 * - Phaser context (scene, game, and factory helpers)
 * - Event bus
 * - Screen navigation
 * - Action dispatch
 *
 * Motivation: enforce explicit dependencies, eliminate globals, and make
 * the Controller pure (no UI imports). See ENV_MIGRATION_PLAN.md for the
 * full migration roadmap.
 */

import { ClientState } from "@Models/ClientState";
import * as Models from "@game/Models";
import EventEmitter from "events";

// ---------------------------------------------------------------------------
// Event bus
// ---------------------------------------------------------------------------

/** A typed event channel — subscribe or emit payloads of type `T`. */
export type EventChannel<T> = Models.Event<T>;

/** Creates a typed event channel backed by the shared emitter. */
export const createEventChannel = <T>(
  emitter: EventEmitter,
  event: string,
): EventChannel<T> => ({
  listen: (callback: (payload: T) => void) => {
    emitter.on(event, callback);
  },
  emit: (payload: T) => {
    emitter.emit(event, payload);
  },
});

// ---------------------------------------------------------------------------
// Phaser context
// ---------------------------------------------------------------------------

export type PhaserContext = {
  /** The active Phaser scene. Re-initialised per scene via `initPhaserIO`. */
  scene: Phaser.Scene;
  /** The Phaser game instance. */
  game: Phaser.Game;
};

// ---------------------------------------------------------------------------
// Screen registry (placeholder — populated during migration Phase 4)
// ---------------------------------------------------------------------------

export type ScreenRegistry = {
  navigateToTitle: () => Promise<void>;
  navigateToBattleground: (state: ClientState) => Promise<void>;
  navigateToOptions: () => Promise<void>;
  navigateToCrystalSelection: () => Promise<void>;
};

const noopScreenRegistry: ScreenRegistry = {
  navigateToTitle: async () => {},
  navigateToBattleground: async () => {},
  navigateToOptions: async () => {},
  navigateToCrystalSelection: async () => {},
};

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

export type Env = {
  /** Current client state snapshot. Use `updateState` to replace it. */
  state: ClientState;

  /** Replace the current state with a new one (single mutation point). */
  updateState: (next: ClientState) => void;

  /** Phaser runtime context (scene, game, and eventually all factory helpers). */
  phaser: PhaserContext;

  /** Shared event emitter. Use `createEventChannel` for typed wrappers. */
  emitter: EventEmitter;

  /** Screen navigation functions. */
  screens: ScreenRegistry;

  /**
   * Dispatch a game action through the server adapter.
   * Returns updated session and optional combat state.
   * The caller is responsible for calling `updateState` with the result.
   */
  dispatch: (action: Models.Action) => Promise<Models.ActionResponse>;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Build an Env from a Phaser scene and initial client state.
 *
 * @param scene   The active Phaser scene (call this in `create()`).
 * @param state   The initial `ClientState` (mutable ref — replaced via `updateState`).
 * @param dispatch An action dispatcher (provided by GameServer wiring).
 */
export const createEnv = (
  scene: Phaser.Scene,
  state: ClientState,
  dispatch: (action: Models.Action) => Promise<Models.ActionResponse>,
): Env => {
  const emitter = new EventEmitter();

  // Wrap state in a mutable cell so `updateState` is the only writer.
  const cell = { current: state };

  return {
    get state() {
      return cell.current;
    },

    updateState(next: ClientState) {
      cell.current = next;
    },

    phaser: {
      scene,
      game: scene.game,
    },

    emitter,

    screens: noopScreenRegistry,

    dispatch,
  };
};
