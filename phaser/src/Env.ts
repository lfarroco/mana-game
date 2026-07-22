/**
 * Env — The application environment for the client UI layer.
 *
 * A module-scoped singleton set once at startup by `createEnv()`.
 * Import it in any module: `import { env } from "./Env"`.
 * Guaranteed to exist whenever any scene code runs (no null checks needed).
 *
 * Replaces the global `window.io` with a typed, explicitly-imported record:
 * - Pure state (ClientState)
 * - Phaser context (scene, game, and all factory helpers)
 * - Typed event channels via `env.createEventChannel<T>(name)`
 * - Screen navigation
 * - Action dispatch
 *
 * Motivation: explicit dependencies, no implicit globals, pure Controller.
 * See ENV_MIGRATION_PLAN.md for the full migration roadmap.
 */

import { ClientState } from "@Models/ClientState";
import * as Models from "@game/Models";
import * as Geometry from "@game/Geometry";
import * as constants from "@Constants";
import * as animation from "@Utils/animation";
import * as Chara from "@Systems/Chara/Chara";
import EventEmitter from "events";

// ---------------------------------------------------------------------------
// Event bus
// ---------------------------------------------------------------------------

export type EventChannel<T> = Models.Event<T>;

const internalCreateEventChannel = <T>(
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

type ContainerChild =
  | Phaser.GameObjects.GameObject
  | (() => Phaser.GameObjects.GameObject)
  | ((prev: Phaser.GameObjects.GameObject) => Phaser.GameObjects.GameObject)[];

type PhaserShaderUniformDef =
  | { key: string; type: "1f"; value: number }
  | { key: string; type: "2f"; value: [number, number] }
  | { key: string; type: "3f"; value: [number, number, number] };

type ShaderUniformValue =
  | { x: number; y: number; z: number }
  | { x: number; y: number }
  | number;

type ShaderUniform = { type: "1f" | "2f" | "3f"; value: ShaderUniformValue };

export type PhaserContext = {
  scene: Phaser.Scene;
  game: Phaser.Game;

  Container: (children?: (ContainerChild | null)[]) => Phaser.GameObjects.Container;
  Image: (texture: string) => Phaser.GameObjects.Image;
  GetByName: (c: Phaser.GameObjects.Container, name: string) => Phaser.GameObjects.GameObject | null;
  SetText: (obj: Phaser.GameObjects.Text, text: string) => void;
  AddChildren: (c: Phaser.GameObjects.Container, children: Phaser.GameObjects.GameObject[]) => void;
  SetName: (obj: Phaser.GameObjects.GameObject, name: string) => void;
  SetInteractiveRect: (size: Size) => (obj: Phaser.GameObjects.GameObject) => Phaser.GameObjects.GameObject;
  Rect: (pos: Vec2, size: Size) => Phaser.Geom.Rectangle;
  Tween: (config: Phaser.Types.Tweens.TweenBuilderConfig) => void;
  SetPosition: (obj: Phaser.GameObjects.GameObject, pos: Vec2) => Phaser.GameObjects.GameObject;
  SetAlpha: (obj: { setAlpha: (n: number) => void }, n: number) => void;
  SetVisible: (obj: { setVisible: (v: boolean) => void }, v: boolean) => void;
  Show: (obj: { setVisible: (v: boolean) => void }) => void;
  Hide: (obj: { setVisible: (v: boolean) => void }) => void;
  Destroy: (obj: Phaser.GameObjects.GameObject) => void;
  BorderedRoundRect: (pos: [number, number], size: [number, number], r?: number, color?: number, alpha?: number) => Phaser.GameObjects.Graphics;
  Rectangle: (pos: [number, number], size: [number, number], color?: number, alpha?: number, stroke?: boolean) => Phaser.GameObjects.Graphics;
  Circle: (pos: Vec2, radius: number, color?: number, alpha?: number) => Phaser.GameObjects.Graphics;
  RectangularDropZone: (name: string, pos: Vec2, size: Size) => Phaser.GameObjects.Zone;
  Centralize: (obj: Phaser.GameObjects.GameObject) => Phaser.GameObjects.GameObject;
  Text: (text: string, style?: Phaser.Types.GameObjects.Text.TextStyle) => Phaser.GameObjects.Text;
  Title1: (text: string) => Phaser.GameObjects.Text;
  Title2: (text: string) => Phaser.GameObjects.Text;
  Label: (text: string) => Phaser.GameObjects.Text;
  SetStyle: (obj: Phaser.GameObjects.Text, style: Phaser.Types.GameObjects.Text.TextStyle) => void;
  SetColor: (text: Phaser.GameObjects.Text, color: string) => void;
  SetStroke: (text: Phaser.GameObjects.Text, color: string, thickness: number) => void;
  WhenDroppedOnZone: (obj: Phaser.GameObjects.GameObject, target: string, cb: (zone: Phaser.GameObjects.Zone) => void) => void;
  OnPointerDown: (obj: Phaser.GameObjects.GameObject, cb: () => void) => void;
  OnPointerUp: (obj: Phaser.GameObjects.GameObject, cb: () => void) => void;
  OnPointerOver: (obj: Phaser.GameObjects.GameObject, cb: () => void) => void;
  OnPointerOut: (obj: Phaser.GameObjects.GameObject, cb: () => void) => void;
  OnceDestroyed: (obj: Phaser.GameObjects.GameObject, cb: () => void) => void;
  OnUpdate: (obj: Phaser.GameObjects.GameObject, cb: (time: number, delta: number) => void) => void;
  Shader: (frag: string, pos: Vec2, size: Size, uniforms: PhaserShaderUniformDef[]) => Phaser.GameObjects.Shader;
  DisableInteractive: (obj: Phaser.GameObjects.GameObject) => void;
  SetUniform: (shader: Phaser.GameObjects.Shader, key: string, value: number) => void;
  BringToTop: (obj: Phaser.GameObjects.GameObject) => void;
  MoveBelow: (a: Phaser.GameObjects.GameObject, b: Phaser.GameObjects.GameObject) => void;
  FadeOut: (duration: number, color: number) => Promise<void>;
  FadeIn: (duration: number) => Promise<void>;
  StartScene: (key: string, data?: object) => void;
  Delay: (duration: number) => Promise<void>;
  clean: () => void;
};

// ---------------------------------------------------------------------------
// makePhaserContext — factory that builds all wrappers bound to a scene
// ---------------------------------------------------------------------------

const makePhaserContext = (scene: Phaser.Scene): PhaserContext => {
  const game = scene.game;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx: PhaserContext = {} as any;
  // Build incrementally so OnUpdate can reference ctx.OnceDestroyed

  ctx.scene = scene;
  ctx.game = game;

  ctx.Container = (children) => {
    const container = scene.add.container();
    if (children) {
      const elements: Phaser.GameObjects.GameObject[] = [];
      children.forEach((child) => {
        if (!child) return;
        if (typeof child === "function") {
          elements.push(child());
        } else if (Array.isArray(child)) {
          if (child.length === 0) return;
          const result = child.reduce<Phaser.GameObjects.GameObject>((acc, fn) => fn(acc), container);
          if (result !== container) elements.push(result);
        } else {
          elements.push(child);
        }
      });
      container.add(elements);
    }
    return container;
  };

  ctx.Image = (texture) => scene.add.image(0, 0, texture);
  ctx.GetByName = (c, name) => c.getByName(name);
  ctx.SetText = (obj, text) => { obj.setText(text); };
  ctx.AddChildren = (c, kids) => { c.add(kids); };
  ctx.SetName = (obj, name) => { obj.setName(name); };

  ctx.SetInteractiveRect = ([w, h]) => (obj) => {
    obj.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    return obj;
  };

  ctx.Rect = ([x, y], [w, h]) => new Phaser.Geom.Rectangle(x, y, w, h);
  ctx.Tween = (config) => { scene.tweens.add(config); };

  ctx.SetPosition = (obj, [x, y]) => {
    (obj as unknown as Phaser.GameObjects.Components.Transform).setPosition(x, y);
    return obj;
  };

  ctx.SetAlpha = (obj, n) => { obj.setAlpha(n); };
  ctx.SetVisible = (obj, v) => { obj.setVisible(v); };
  ctx.Show = (obj) => { obj.setVisible(true); };
  ctx.Hide = (obj) => { obj.setVisible(false); };
  ctx.Destroy = (obj) => { obj.destroy(true); };

  ctx.BorderedRoundRect = ([x, y], [w, h], cornerRadius = 10, color = 0xffa500, alpha = 0.7) => {
    const [ox, oy] = Geometry.sumVec2([x, y], [-w / 2, -h / 2]);
    const g = scene.add.graphics({ x: ox, y: oy });
    g.lineStyle(2, 0xffffff, 0.5);
    g.fillStyle(color, alpha);
    g.fillRoundedRect(0, 0, w, h, cornerRadius);
    g.strokeRoundedRect(0, 0, w, h, cornerRadius);
    return g;
  };

  ctx.Rectangle = ([x, y], [w, h], color = 0xffa500, alpha = 0.7, stroke) => {
    const [ox, oy] = Geometry.sumVec2([x, y], [-w / 2, -h / 2]);
    const g = scene.add.graphics({ x: ox, y: oy });
    g.lineStyle(4, 0xffffff, 0.8);
    g.fillStyle(color, alpha);
    g.fillRect(0, 0, w, h);
    if (stroke) g.strokeRect(0, 0, w, h);
    return g;
  };

  ctx.Circle = ([x, y], radius, color = 0xffa500, alpha = 0.7) => {
    const g = scene.add.graphics({ x, y });
    g.fillStyle(color, alpha);
    g.fillCircle(0, 0, radius);
    return g;
  };

  ctx.RectangularDropZone = (name, [x, y], [w, h]) => {
    const zone = scene.add.zone(x, y, w, h);
    zone.setName(name);
    zone.setRectangleDropZone(w, h);
    return zone;
  };

  ctx.Centralize = (obj) => {
    (obj as unknown as Phaser.GameObjects.Components.Origin).setOrigin(0.5);
    return obj;
  };

  ctx.Text = (text, style = constants.defaultTextConfig) => scene.add.text(0, 0, text, style);
  ctx.Title1 = (text) => ctx.Text(text, constants.titleTextConfig);
  ctx.Title2 = (text) => ctx.Text(text, { ...constants.titleTextConfig, fontSize: "22px" });
  ctx.Label = (text) => ctx.Text(text, constants.defaultTextConfig);
  ctx.SetStyle = (obj, style) => { obj.setStyle(style); };
  ctx.SetColor = (text, color) => { text.setColor(color); };
  ctx.SetStroke = (text, color, thickness) => { text.setStroke(color, thickness); };

  ctx.WhenDroppedOnZone = (obj, target, callback) => {
    obj.on(Phaser.Input.Events.DROP, (_: Pointer, actual: Phaser.GameObjects.Zone) => {
      if (target === actual.name) callback(actual);
    });
  };

  ctx.OnPointerDown = (obj, cb) => { obj.on(Phaser.Input.Events.POINTER_DOWN, cb); };
  ctx.OnPointerUp = (obj, cb) => { obj.on(Phaser.Input.Events.POINTER_UP, cb); };
  ctx.OnPointerOver = (obj, cb) => { obj.on(Phaser.Input.Events.POINTER_OVER, cb); };
  ctx.OnPointerOut = (obj, cb) => { obj.on(Phaser.Input.Events.POINTER_OUT, cb); };
  ctx.OnceDestroyed = (obj, cb) => { obj.once("destroy", cb); };

  ctx.OnUpdate = (obj, callback) => {
    scene.events.on(Phaser.Scenes.Events.UPDATE, callback);
    ctx.OnceDestroyed(obj, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, callback);
    });
  };

  ctx.Shader = (frag, [x, y], [w, h], uniforms) => {
    const shaderUniforms: Record<string, ShaderUniform> = {};
    uniforms.forEach((u) => {
      shaderUniforms[u.key] = {
        type: u.type,
        value: u.type === "3f"
          ? { x: u.value[0], y: u.value[1], z: u.value[2] }
          : u.type === "2f"
            ? { x: u.value[0], y: u.value[1] }
            : u.value,
      };
    });
    const base = new Phaser.Display.BaseShader("magic-button", frag, undefined, shaderUniforms);
    return scene.add.shader(base, x, y, w, h);
  };

  ctx.DisableInteractive = (obj) => { obj.disableInteractive(); };
  ctx.SetUniform = (shader, key, value) => { shader.setUniform(key, value); };
  ctx.BringToTop = (obj) => { scene.children.bringToTop(obj); };
  ctx.MoveBelow = (a, b) => { scene.children.moveBelow(a, b); };

  ctx.FadeOut = (duration, color) => new Promise<void>((resolve) => {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    scene.cameras.main.fade(duration, r, g, b);
    scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, resolve);
  });

  ctx.FadeIn = (duration) => new Promise<void>((resolve) => {
    scene.cameras.main.fadeIn(duration);
    scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, resolve);
  });

  ctx.StartScene = (key, data) => { scene.scene.start(key, data); };
  ctx.Delay = (duration) => animation.delay(duration);

  ctx.clean = () => {
    Chara.clearAll();
    scene.children.each((c) => c.destroy());
    scene.children.removeAll();
    scene.tweens.killAll();
    scene.time.removeAllEvents();
  };

  return ctx;
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

  /** Phaser runtime context with all factory helpers. */
  phaser: PhaserContext;

  /** Shared event emitter. Prefer `createEventChannel` for typed wrappers. */
  emitter: EventEmitter;

  /**
   * Create a typed event channel backed by this env's emitter.
   * No separate import or emitter argument needed — everything flows from env.
   */
  createEventChannel: <T>(event: string) => EventChannel<T>;

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
// Singleton (module-scoped, never null after init)
// ---------------------------------------------------------------------------

/**
 * The application environment — set once at startup by `createEnv()`.
 * Import this directly: `import { env } from "./Env"`.
 * Guaranteed to exist whenever any scene code runs.
 */
export let env: Env;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Build the Env singleton from a Phaser scene and initial client state.
 * Must be called once in `Client.create()` before any scene code uses `env`.
 *
 * @param scene   The active Phaser scene.
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

  const instance: Env = {
    get state() {
      return cell.current;
    },

    updateState(next: ClientState) {
      cell.current = next;
    },

    phaser: makePhaserContext(scene),

    emitter,

    createEventChannel<T>(event: string): EventChannel<T> {
      return internalCreateEventChannel<T>(emitter, event);
    },

    screens: noopScreenRegistry,

    dispatch,
  };

  // Set the singleton so `import { env } from "./Env"` works anywhere.
  env = instance;

  return instance;
};
