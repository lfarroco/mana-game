/**
 * PhaseController — the framework-free phase runner used by multi-phase
 * screens (currently the battleground).
 *
 * A "phase" is a mutually exclusive view state of one screen (encounter, shop,
 * combat, …). This is the raw-scene replacement for `@mana/framework`'s
 * `createScreen({ phases })`: it keeps the two things a screen genuinely needs
 * from that machinery, and nothing else.
 *
 *   1. **Scoped resources** — everything a phase handler creates is destroyed
 *      when the phase ends: `ctx.track(obj)` registers a destroyable, and
 *      `ctx.listen(event, cb)` registers an event subscription in the same
 *      scope. Handlers may also just *return* their destroyables (a single
 *      one or an array) and they are tracked automatically.
 *   2. **Serialised transitions** — `go(phase)` runs
 *      `exit(outgoing) → destroy outgoing → handler(incoming) → enter(incoming)`
 *      on a promise chain, so rapid calls cannot interleave async teardown.
 *      `startPhaseExit()` / `restorePhaseExit()` let a caller overlap the
 *      outgoing exit animation with an async server dispatch and bring the UI
 *      back if that dispatch fails.
 *
 * No runtime imports — this module is unit-testable without Phaser.
 */

import type { Event } from "@game/Models";

/**
 * Anything a phase handler can hand back for automatic teardown. `destroy` may
 * return a promise, in which case the phase switch waits for it before running
 * the next handler.
 */
export type Destroyable = { destroy: () => void | Promise<void> };

/**
 * Constraint every event catalog satisfies. Only `clear` is structurally
 * required, which keeps the catalog's own payload types intact (a
 * `Record<string, Event<any>>` would erase them).
 */
export type EventRecord = Record<string, { clear: () => void }>;

/** Declarative enter/exit animation for a phase, run on its elements. */
export type PhaseTransition = {
	/** Animate the incoming phase's elements in. Runs after the handler. */
	enter?: (elements: Destroyable[]) => void | Promise<void>;
	/** Animate the outgoing phase's elements out. Runs before they're destroyed. */
	exit?: (elements: Destroyable[]) => void | Promise<void>;
};

/** Context handed to a phase handler. */
export type PhaseContext<TPhase extends string, E extends EventRecord> = {
	/** Track a destroyable for the lifetime of the phase executing the handler. */
	track: <T extends Destroyable>(obj: T) => T;
	/** Subscribe to an event for the lifetime of the phase executing the handler. */
	listen: <T>(event: Event<T>, cb: (payload: T) => void | Promise<void>) => void;
	/** Switch to another phase (destroys the current phase's scoped resources). */
	go: (phase: TPhase) => Promise<void>;
	/** The screen's event catalog (`BattlegroundEvent`). */
	readonly events: E;
};

export type PhaseHandler<TPhase extends string, E extends EventRecord> = (
	ctx: PhaseContext<TPhase, E>
) => void | Destroyable | Destroyable[] | Promise<void | Destroyable | Destroyable[]>;

/**
 * A phase entry is either a bare handler (no transition) or an object with a
 * handler plus an optional enter/exit animation.
 */
export type PhaseEntry<TPhase extends string, E extends EventRecord> =
	PhaseHandler<TPhase, E> | { handler: PhaseHandler<TPhase, E>; transition?: PhaseTransition };

/** Normalize a phase entry to its `{ handler, transition }` shape. */
function normalizeEntry<TPhase extends string, E extends EventRecord>(
	entry: PhaseEntry<TPhase, E>
): { handler: PhaseHandler<TPhase, E>; transition?: PhaseTransition } {
	return typeof entry === "function" ? { handler: entry } : entry;
}

export type PhaseController<TPhase extends string> = {
	/** Serialised phase switch: exit → destroy → handler → enter. */
	go: (phase: TPhase) => Promise<void>;
	/** Active phase, or null before the first transition. */
	currentPhase: () => TPhase | null;
	/** Run the current phase's exit animation early (idempotent). */
	startPhaseExit: () => Promise<void>;
	/** Reverse a pending `startPhaseExit()`. */
	restorePhaseExit: () => Promise<void>;
	/** Tear down the current phase and stop accepting transitions. */
	destroy: () => void;
};

export function createPhaseController<TPhase extends string, E extends EventRecord>(spec: {
	/** Screen name, used in diagnostics only. */
	name: string;
	events: E;
	phases: Record<TPhase, PhaseEntry<TPhase, E>>;
	/**
	 * Called when `go()` targets a phase this screen does not declare. The
	 * target can only come from outside the screen (a session authored by a
	 * newer build), so the screen decides how to surface it — the controller
	 * itself stays framework-free. Without a handler the run would just stop at
	 * a blank phase: the previous UI was already exited and the session has
	 * already advanced.
	 */
	onUnknownPhase?: (phase: TPhase) => void;
}): PhaseController<TPhase> {
	const phases = spec.phases;

	let phase: TPhase | null = null;
	let elements: Destroyable[] = [];
	let disposed = false;
	let exitAlreadyRan = false;

	// Per-screen transition chain: `then(op, op)` keeps it alive after a failed
	// transition, so one rejected handler cannot wedge every later `go()`.
	let chain: Promise<void> = Promise.resolve();

	const ctx: PhaseContext<TPhase, E> = {
		track: (obj) => {
			elements.push(obj);
			return obj;
		},
		listen: (event, cb) => {
			elements.push({ destroy: event.listen(cb) });
		},
		go: (next) => go(next),
		events: spec.events,
	};

	async function runExit(entry: PhaseEntry<TPhase, E> | undefined): Promise<void> {
		const { transition } = entry ? normalizeEntry(entry) : {};
		if (!transition?.exit) return;
		await transition.exit(elements);
	}

	async function runEnter(
		entry: PhaseEntry<TPhase, E> | undefined,
		targets: Destroyable[]
	): Promise<void> {
		const { transition } = entry ? normalizeEntry(entry) : {};
		if (!transition?.enter) return;
		await transition.enter(targets);
	}

	/**
	 * Destroy every resource in the current phase scope. Async teardown is
	 * awaited so the next handler cannot race it (e.g. a controller that is
	 * still winding down).
	 */
	async function clearElements(): Promise<void> {
		const current = elements;
		elements = [];
		for (const el of current) {
			try {
				await el.destroy();
			} catch (err) {
				console.warn(`[PhaseController:"${spec.name}"] failed to destroy a phase element`, err);
			}
		}
	}

	async function run(next: TPhase): Promise<void> {
		const entry = phases[next];
		if (!entry) {
			console.warn(
				`[PhaseController:"${spec.name}"] go("${next}") ignored — no such phase ` +
					`(declared: ${Object.keys(phases).join(", ") || "<none>"}).`
			);
			// Let the screen surface this to the player (it is not a transient
			// condition: nothing in this build can render or advance the phase).
			spec.onUnknownPhase?.(next);
			return;
		}

		const outgoing = phase ? phases[phase] : undefined;

		// 1. Exit animation on the outgoing phase's elements. Skipped when
		//    startPhaseExit() already ran it (e.g. overlapping a dispatch).
		if (!exitAlreadyRan) await runExit(outgoing);
		exitAlreadyRan = false;
		if (disposed) return;

		// 2. Destroy the outgoing phase's scoped resources.
		await clearElements();
		phase = next;
		if (disposed) return;

		// 3. Run the incoming handler with a fresh scope.
		const result = await normalizeEntry(entry).handler(ctx);
		if (disposed) return;
		if (result) {
			for (const el of Array.isArray(result) ? result : [result]) {
				elements.push(el);
			}
		}

		// 4. Enter animation on every phase-scoped element (returned or tracked).
		const entering = elements;
		if (entering.length > 0) await runEnter(entry, entering);
	}

	const go = (next: TPhase): Promise<void> => {
		chain = chain.then(
			() => run(next),
			() => run(next)
		);
		return chain;
	};

	async function startPhaseExit(): Promise<void> {
		if (exitAlreadyRan) return;
		if (!phase) return;
		const entry = phases[phase];
		try {
			await runExit(entry);
		} catch (err) {
			console.warn(`[PhaseController:"${spec.name}"] exit transition failed`, err);
		}
		// Consume the exit for the upcoming go() only if still alive.
		if (!disposed) exitAlreadyRan = true;
	}

	async function restorePhaseExit(): Promise<void> {
		if (!exitAlreadyRan) return;
		if (!phase) return;
		const entry = phases[phase];
		try {
			await runEnter(entry, elements);
		} catch (err) {
			console.warn(`[PhaseController:"${spec.name}"] enter transition (restore) failed`, err);
		}
		if (!disposed) exitAlreadyRan = false;
	}

	return {
		go,
		currentPhase: () => phase,
		startPhaseExit,
		restorePhaseExit,
		destroy: () => {
			disposed = true;
			void clearElements();
			phase = null;
			exitAlreadyRan = false;
			// Detach from this (dead) controller; swallow in-flight outcomes so
			// they cannot surface as unhandled rejections.
			void chain.catch(() => {});
			chain = Promise.resolve();
		},
	};
}
