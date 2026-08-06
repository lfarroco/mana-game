/**
 * phaser-helpers — genuinely useful composables that add value beyond renaming.
 *
 * These are NOT wrappers around Phaser. They are higher-level abstractions
 * that combine multiple Phaser calls into a single intent:
 * - container() auto-adds children (native Phaser doesn't)
 * - borderedRoundRect() centers and draws border+fill in one call
 * - shader() translates tuple uniforms to Phaser's {x,y,z} shape
 * - whenDroppedOnZone() matches drop targets by name
 *
 * Import what you need: `import { container } from "./phaser-helpers"`.
 */

import { env } from "@Env";
import * as Geometry from "@game/Geometry";

// ---------------------------------------------------------------------------
// Container with auto-added children
// ---------------------------------------------------------------------------

type ContainerChild =
  | Phaser.GameObjects.GameObject
  | (() => Phaser.GameObjects.GameObject)
  | ((prev: Phaser.GameObjects.GameObject) => Phaser.GameObjects.GameObject)[];

/**
 * Phaser's `scene.add.container()` doesn't accept children — you must call
 * `container.add(kids)` separately. This accepts children inline.
 *
 * Children can be GameObjects, lazy thunks, or composable function chains.
 */
export const container = (
  children?: (ContainerChild | null)[],
): Phaser.GameObjects.Container => {
  const c = env.scene.add.container();
  if (!children) return c;

  const elements: Phaser.GameObjects.GameObject[] = [];
  children.forEach((child) => {
    if (!child) return;
    if (typeof child === "function") {
      elements.push(child());
    } else if (Array.isArray(child)) {
      if (child.length === 0) return;
      const result = child.reduce<Phaser.GameObjects.GameObject>((acc, fn) => fn(acc), c);
      if (result !== c) elements.push(result);
    } else {
      elements.push(child);
    }
  });
  c.add(elements);
  return c;
};

// ---------------------------------------------------------------------------
// Centered bordered rounded rect
// ---------------------------------------------------------------------------

/**
 * Draws a rounded rectangle centered at [x, y] with fill and border.
 * Phaser's native graphics API positions from top-left — this centers them.
 */
export const borderedRoundRect = (
  scene: Phaser.Scene,
  pos: [number, number],
  size: [number, number],
  cornerRadius = 10,
  color = 0xffa500,
  alpha = 0.7,
): Phaser.GameObjects.Graphics => {
  const [x, y] = pos;
  const [w, h] = size;
  const [ox, oy] = Geometry.sumVec2([x, y], [-w / 2, -h / 2]);
  const g = scene.add.graphics({ x: ox, y: oy });
  g.lineStyle(2, 0xffffff, 0.5);
  g.fillStyle(color, alpha);
  g.fillRoundedRect(0, 0, w, h, cornerRadius);
  g.strokeRoundedRect(0, 0, w, h, cornerRadius);
  return g;
};

// ---------------------------------------------------------------------------
// Centered rectangle
// ---------------------------------------------------------------------------

export const centeredRect = (
  scene: Phaser.Scene,
  pos: [number, number],
  size: [number, number],
  color = 0xffa500,
  alpha = 0.7,
  stroke?: boolean,
): Phaser.GameObjects.Graphics => {
  const [x, y] = pos;
  const [w, h] = size;
  const [ox, oy] = Geometry.sumVec2([x, y], [-w / 2, -h / 2]);
  const g = scene.add.graphics({ x: ox, y: oy });
  g.lineStyle(4, 0xffffff, 0.8);
  g.fillStyle(color, alpha);
  g.fillRect(0, 0, w, h);
  if (stroke) g.strokeRect(0, 0, w, h);
  return g;
};

// ---------------------------------------------------------------------------
// Drop zone by name
// ---------------------------------------------------------------------------

/**
 * Registers a drop handler that matches targets by name.
 * Unlike raw Phaser DROP events, this filters by zone name automatically.
 */
export const whenDroppedOnZone = (
  obj: Phaser.GameObjects.GameObject,
  targetName: string,
  callback: (zone: Phaser.GameObjects.Zone) => void,
): void => {
  obj.on(Phaser.Input.Events.DROP, (_: Pointer, actual: Phaser.GameObjects.Zone) => {
    if (targetName === actual.name) callback(actual);
  });
};

// ---------------------------------------------------------------------------
// Shader with tuple uniforms
// ---------------------------------------------------------------------------

type ShaderUniformDef =
  | { key: string; type: "1f"; value: number }
  | { key: string; type: "2f"; value: [number, number] }
  | { key: string; type: "3f"; value: [number, number, number] };

/**
 * Creates a shader game object with tuple-style uniforms.
 * Phaser's built-in Shader uses {x, y, z} objects — this accepts tuples.
 */
export const shader = (
  scene: Phaser.Scene,
  frag: string,
  pos: Vec2,
  size: Size,
  uniforms: ShaderUniformDef[],
): Phaser.GameObjects.Shader => {
  const [x, y] = pos;
  const [w, h] = size;
  const shaderUniforms: Record<string, { type: "1f" | "2f" | "3f"; value: unknown }> = {};
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

// ---------------------------------------------------------------------------
// Drop zone factory
// ---------------------------------------------------------------------------

export const rectangularDropZone = (
  scene: Phaser.Scene,
  name: string,
  pos: Vec2,
  size: Size,
): Phaser.GameObjects.Zone => {
  const [x, y] = pos;
  const [w, h] = size;
  const zone = scene.add.zone(x, y, w, h);
  zone.setName(name);
  zone.setRectangleDropZone(w, h);
  return zone;
};
