/**
 * phaseTransitions — declarative slide transitions for battleground phase UI.
 *
 * Phase handlers return a flat list of mixed elements: Phaser Containers,
 * Graphics, Texts, Shaders, UIButton wrappers (`{ container, ... }`), and plain
 * teardown destroyables (e.g. the combat phase's playback controller). These
 * helpers resolve every animatable element, then slide it in/out with a small
 * per-element stagger so multi-part UIs (shop cards, orb rows, results panels)
 * cascade into place part-by-part.
 *
 * slideOut() snapshots each element's resting position; slideIn() is
 * restore-aware — an element that already exited tweens back to its snapshot
 * instead of being re-staged off-screen. This lets a failed transition (e.g. a
 * rejected server dispatch) bring the UI back into view.
 *
 * Elements can opt out of both directions by setting the `skipPhaseTransition`
 * data key on their GameObject — e.g. an orb that was dropped on a unit and is
 * dissolving in place at the drop target stays exactly where it is while the
 * rest of the phase slides out (see `MagicOrb.startDissolve`).
 */

import * as animation from "@Utils/animation";
import { env } from "@Env";
import type { Destroyable } from "@mana/framework";

export const PHASE_TRANSITION_MS = 300;
export const SLIDE_DISTANCE = 90;

const STAGGER_MIN_MS = 25;
const STAGGER_MAX_MS = 60;
// The whole cascade is compressed into this fixed window, so long element
// lists (e.g. a shop row with 5 parts per card) don't drag out proportionally.
const STAGGER_WINDOW_MS = 220;

export type PhaseTransitionOptions = {
	/** Tween duration per element. Defaults to PHASE_TRANSITION_MS. */
	duration?: number;
	/** Slide distance in px. Defaults to SLIDE_DISTANCE. */
	distance?: number;
	/** Explicit stagger between elements (overrides the auto-compression). */
	stagger?: number;
	/** Direction elements slide from (enter) / to (exit). Defaults to "right". */
	direction?: "left" | "right";
};

/** Minimal structural shape of an animatable Phaser GameObject. */
type Animatable = {
	x: number;
	y: number;
	/**
	 * Present on most GameObjects — but NOT on Phaser Shaders (their alpha is
	 * controlled via uniforms). Optional so Shaders slide without fading.
	 */
	alpha?: number;
	active?: boolean;
	scene?: unknown;
	getData?: (key: string) => unknown;
};

// Resting positions captured by slideOut(), keyed by the animatable target, so
// slideIn() can restore a mid-exit element instead of treating it as fresh.
const restingState = new WeakMap<object, { x: number; y: number; alpha?: number }>();

function isDestroyed(obj: Animatable): boolean {
	// Phaser sets both of these when GameObject.destroy() runs.
	if (obj.active === false) return true;
	if ("scene" in obj && (obj.scene === undefined || obj.scene === null)) {
		return true;
	}
	return false;
}

/**
 * Elements opted out of transitions via the "skipPhaseTransition" data key
 * (e.g. an orb that was dropped on a unit and is dissolving in place at the
 * drop target) stay exactly where they are while the rest of the phase slides.
 */
function isTransitionSkipped(obj: Animatable): boolean {
	return typeof obj.getData === "function" && obj.getData("skipPhaseTransition") === true;
}

/**
 * Resolve a returned element to the object whose x/y/alpha we can tween.
 * UIButton returns a wrapper `{ container, ... }` — animate the underlying
 * Container. Bare GameObjects pass through. Plain destroyables (no x/y) and
 * destroyed objects resolve to null and are skipped.
 */
function toAnimatable(el: unknown): Animatable | null {
	if (!el || typeof el !== "object") return null;
	const obj = el as Record<string, unknown>;
	const candidate = (obj.container as Animatable | undefined) ?? (obj as unknown as Animatable);
	if (typeof candidate.x !== "number" || typeof candidate.y !== "number") {
		return null;
	}
	return candidate;
}

function resolveStagger(count: number, opts: PhaseTransitionOptions): number {
	if (opts.stagger !== undefined) return opts.stagger;
	if (count <= 1) return 0;
	return Math.max(
		STAGGER_MIN_MS,
		Math.min(STAGGER_MAX_MS, Math.floor(STAGGER_WINDOW_MS / (count - 1)))
	);
}

/**
 * Slide the phase's elements in from the given direction (default: right),
 * fading from 0 to their resting alpha, one element after another.
 *
 * For elements that were previously slid out (restore path) this tweens them
 * back to their snapshotted resting position instead of re-offsetting them.
 */
export async function slideIn(
	elements: Destroyable[],
	opts: PhaseTransitionOptions = {}
): Promise<void> {
	const duration = opts.duration ?? PHASE_TRANSITION_MS;
	const distance = opts.distance ?? SLIDE_DISTANCE;
	const sign = opts.direction === "left" ? -1 : 1;
	const targets = elements
		.map(toAnimatable)
		.filter((t): t is Animatable => t !== null && !isDestroyed(t) && !isTransitionSkipped(t));

	if (targets.length === 0) return;

	const stagger = resolveStagger(targets.length, opts);

	await Promise.all(
		targets.map((obj, index) => {
			const rest = restingState.get(obj);
			const final = rest ?? { x: obj.x, y: obj.y, alpha: obj.alpha };
			// Some GameObjects (Phaser Shaders) have no alpha component — slide
			// them without fading. Tweening `alpha: undefined` would make Phaser's
			// tween builder throw, so it is only added when actually present.
			const alpha = final.alpha;
			const hasAlpha = typeof alpha === "number";

			// Fresh elements: stage the offset start position before tweening in.
			// Restored elements: stay where they are (the slid-out spot) and tween
			// back to the snapshot.
			if (!rest) {
				obj.x += sign * distance;
				if (hasAlpha) obj.alpha = 0;
			}

			// Drop any in-flight tween (e.g. a still-running exit) so it can't fight
			// this one for x/alpha.
			env.scene.tweens.killTweensOf(obj);

			return animation.tween({
				targets: [obj as unknown as Phaser.GameObjects.GameObject],
				x: final.x,
				y: final.y,
				...(hasAlpha ? { alpha } : {}),
				duration,
				delay: index * stagger,
				ease: "Cubic.easeOut",
			});
		})
	);
}

/**
 * Slide the phase's elements out (default: to the right) and fade them to 0.
 * Snapshots each element's resting position first so slideIn() can restore it.
 */
export async function slideOut(
	elements: Destroyable[],
	opts: PhaseTransitionOptions = {}
): Promise<void> {
	const duration = opts.duration ?? PHASE_TRANSITION_MS;
	const distance = opts.distance ?? SLIDE_DISTANCE;
	const sign = opts.direction === "left" ? -1 : 1;
	const targets = elements
		.map(toAnimatable)
		.filter((t): t is Animatable => t !== null && !isDestroyed(t) && !isTransitionSkipped(t));

	if (targets.length === 0) return;

	const stagger = resolveStagger(targets.length, opts);

	await Promise.all(
		targets.map((obj, index) => {
			if (!restingState.has(obj)) {
				restingState.set(obj, { x: obj.x, y: obj.y, alpha: obj.alpha });
			}
			// Drop any in-flight tween (e.g. a restore fighting this exit).
			env.scene.tweens.killTweensOf(obj);
			return animation.tween({
				targets: [obj as unknown as Phaser.GameObjects.GameObject],
				x: obj.x + sign * distance,
				...(typeof obj.alpha === "number" ? { alpha: 0 } : {}),
				duration,
				delay: index * stagger,
				ease: "Cubic.easeIn",
			});
		})
	);
}

/** Drop-in `{ enter, exit }` used by every battleground phase entry. */
export const slideTransition = {
	enter: slideIn,
	exit: slideOut,
};
