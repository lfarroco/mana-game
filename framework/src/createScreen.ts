/**
 * createScreen — resource-tracking screen factory.
 *
 * A screen built with createScreen() gets:
 *   - idempotent init() + automatic cleanup in destroy()
 *   - automatic object tracking via ctx.track(obj, { id })
 *     accepts single objects or arrays via overloads
 *   - a persistent layer (spec.create) whose elements survive phase switches;
 *     may return Destroyable(s) to auto-track instead of calling ctx.track()
 *   - mutually exclusive phases (spec.phases) — or omit for single-view screens;
 *     phase handlers may return Destroyable(s) to auto-track them
 *   - ctx.refresh() to re-run the current phase handler (locale changes, etc.)
 *   - screenModule() helper to reduce per-screen export boilerplate
 *   - ID-based element recovery via ctx.findById(id) and the module-level
 *     findTrackedById(id) for helpers without ctx access
 *   - declarative phase transitions: each phase may declare an `enter` and/or
 *     `exit` animation that runs on the elements the handler returns (enter)
 *     or on the outgoing phase's elements before they are destroyed (exit)
 *
 * This module has no runtime imports (types only) so it stays unit-testable
 * without any engine mock.
 */

import type { Event } from "./Event";
import type { ScreenModule } from "./Screen";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Clearable = { clear: () => void };

type EventRecord = Record<string, Clearable>;

/**
 * Minimal shape the tracker needs — anything with a destroy() method.
 * Satisfied by Phaser.GameObjects.GameObject (`destroy(fromScene?)` is
 * assignable to `() => void`), event unsubscribers, and by plain wrapper
 * objects (e.g. BackgroundOverlay) that manage underlying resources.
 */
export type Destroyable = { destroy: () => void };

/**
 * Declarative phase transition.  `enter` animates the incoming phase's
 * returned elements in; `exit` animates the outgoing phase's returned
 * elements out before they are destroyed.  Both are optional — a phase
 * without a transition just appears/disappears instantly.
 */
export type PhaseTransition = {
	/** Animate the incoming phase's returned elements in. Runs after the handler. */
	enter?: (elements: Destroyable[]) => void | Promise<void>;
	/** Animate the outgoing phase's returned elements out. Runs before they're destroyed. */
	exit?: (elements: Destroyable[]) => void | Promise<void>;
};

type PhaseHandler<TPhase extends string, E extends EventRecord = EventRecord> = (
	ctx: ScreenCtx<TPhase, E>,
) => void | Destroyable | Destroyable[] | Promise<void | Destroyable | Destroyable[]>;

/**
 * A phase entry is either a bare handler (no transition) or an object with a
 * handler plus an optional transition.
 */
export type PhaseEntry<TPhase extends string, E extends EventRecord = EventRecord> =
	| PhaseHandler<TPhase, E>
	| { handler: PhaseHandler<TPhase, E>; transition?: PhaseTransition };

type PhaseMap<TPhase extends string, E extends EventRecord = EventRecord> = Record<
	TPhase,
	PhaseEntry<TPhase, E>
>;

/** Options for single-object add(). */
type SingleTrackOpts = { id?: string };

/** Options for array add().  idPrefix produces keys like "prefix-0", "prefix-1", ... */
type ArrayTrackOpts = { idPrefix?: string };

/** Context handed to a screen's `create` and phase handlers. */
export interface ScreenCtx<TPhase extends string = string, E extends EventRecord = EventRecord> {
	/**
	 * Track a single destroyable object.  Objects added in the persistent
	 * `create` layer survive phase transitions; objects added inside a phase
	 * handler are destroyed automatically when the next phase starts.
	 * Previously called "add"
	 */
	track<T extends Destroyable>(obj: T, opts?: SingleTrackOpts): T;

	/**
	 * Track an array of destroyable objects.  Each element is registered
	 * individually.  Use `idPrefix` to give them predictable IDs for
	 * findById() lookup; otherwise auto-generated IDs are used.
	 */
	track<T extends Destroyable>(objs: T[], opts?: ArrayTrackOpts): T[];

	/** Recover a tracked element by ID (persistent layer first, then current phase). */
	findById: <T extends Destroyable>(id: string) => T | undefined;

	/** Switch phase: destroys the current phase's tracked elements, then runs the phase handler. */
	go: (phase: TPhase) => Promise<void>;

	/**
	 * Re-run the current phase handler.  Destroys all phase-scoped objects
	 * and calls the handler again.  No-op for single-view screens (no phases
	 * configured).
	 */
	refresh: () => Promise<void>;

	/** Name of the active phase, or null before the first transition. */
	readonly currentPhase: TPhase | null;

	/** Register a disposer that runs when the screen is destroyed. */
	onDestroy: (disposer: () => void) => void;

	/**
	 * Subscribe to an event for the current scope's lifetime.
	 *
	 * When called inside a phase handler, the subscription is destroyed on the
	 * next phase switch or ctx.refresh(); when called from the persistent
	 * `create` layer, it survives phase transitions and is disposed on screen
	 * destroy.  This gives phase handlers their own scoped listeners without
	 * requiring a per-phase event catalog.
	 */
	listen<T>(event: Event<T>, cb: (payload: T) => void | Promise<void>): void;

	/** Screen-local events. Re-created per init cycle; access after create(). */
	readonly events: E;
}

/** Object returned by createScreen() — satisfies the ScreenModule shape used by the ScreenManager. */
export type ScreenResult<TPhase extends string, E extends EventRecord> = {
	readonly name: string;

	/** Screen-local events.  Re-created by every init(); do not cache across destroy(). */
	readonly events: E;

	/** Switch phase from outside the screen (e.g. component callbacks). */
	go: (phase: TPhase) => Promise<void>;

	currentPhase: () => TPhase | null;

	// ScreenModule lifecycle -------------------------------------------------

	init: () => void;
	create: () => Promise<void>;
	destroy: () => void;
};

// ---------------------------------------------------------------------------
// Active-tracker registry — only one screen is active at a time (navigation
// is serialised by the nav mutex in the ScreenManager), so a single module-level
// reference is enough for helpers that lack ctx access.
// ---------------------------------------------------------------------------

let activeTracker: PhaseTracker<string> | null = null;

/** Find a tracked element by ID on the currently active screen. */
export function findTrackedById<T extends Destroyable>(
	id: string,
): T | undefined {
	return activeTracker?.findById<T>(id);
}

// ---------------------------------------------------------------------------
// TrackedGroup — a conceptual container for elements returned by phase
// handlers.  When the group is destroyed, all its children are destroyed.
// This avoids coupling to a specific engine's container while still providing
// group-cleanup semantics.
// ---------------------------------------------------------------------------

class TrackedGroup implements Destroyable {
	private children: Destroyable[] = [];

	/** The raw returned elements, for transitions to animate. */
	get elements(): Destroyable[] {
		return this.children;
	}

	add(child: Destroyable): void {
		this.children.push(child);
	}

	destroy(): void {
		for (const child of this.children) {
			child.destroy();
		}
		this.children = [];
	}
}

// ---------------------------------------------------------------------------
// PhaseTracker
// ---------------------------------------------------------------------------

class PhaseTracker<TPhase extends string> {
	private persistent = new Map<string, Destroyable>();
	private phaseObjects = new Map<string, Destroyable>();
	private mode: "persistent" | "phase" = "persistent";
	private counter = 0;

	currentPhase: TPhase | null = null;

	constructor() {
		activeTracker = this as unknown as PhaseTracker<string>;
	}

	/** Track a single object or an array of objects in the current scope. */
	track(obj: Destroyable | Destroyable[], opts?: SingleTrackOpts | ArrayTrackOpts): void {
		const target = this.mode === "phase" ? this.phaseObjects : this.persistent;

		if (Array.isArray(obj)) {
			const prefix = (opts as ArrayTrackOpts)?.idPrefix ?? `__tracked_${this.counter}_`;
			obj.forEach((item, i) => {
				target.set(`${prefix}${i}`, item);
			});
			this.counter += obj.length;
		} else {
			const key = (opts as SingleTrackOpts)?.id ?? `__tracked_${++this.counter}`;
			target.set(key, obj);
		}
	}

	findById<T extends Destroyable>(id: string): T | undefined {
		return (
			(this.persistent.get(id) as T | undefined) ??
			(this.phaseObjects.get(id) as T | undefined)
		);
	}

	/** All elements tracked by the current phase (for exit transitions). */
	getPhaseElements(): Destroyable[] {
		return Array.from(this.phaseObjects.values());
	}

	/** Enter phase scope: subsequent add() calls register to the phase. */
	beginPhase(): void {
		this.mode = "phase";
	}

	/** Leave phase scope: subsequent add() calls register to the persistent layer. */
	endPhase(): void {
		this.mode = "persistent";
	}

	/** Destroy every object tracked by the current phase. */
	clearPhase(): void {
		for (const obj of this.phaseObjects.values()) {
			obj.destroy();
		}
		this.phaseObjects.clear();
	}

	/** Destroy everything tracked (phase + persistent) and detach the active-tracker ref. */
	destroyAll(): void {
		this.clearPhase();
		for (const obj of this.persistent.values()) {
			obj.destroy();
		}
		this.persistent.clear();
		this.currentPhase = null;
		if (activeTracker === (this as unknown as PhaseTracker<string>)) {
			activeTracker = null;
		}
	}
}

// ---------------------------------------------------------------------------
// createScreen
// ---------------------------------------------------------------------------

export function createScreen<TPhase extends string, E extends EventRecord>(spec: {
	name: string;
	/** Create the screen-local events and wire their listeners.  Runs once per init(). */
	events: () => { events: E; listeners: (() => void)[] };
	/**
	 * Persistent layer — runs once per create(); elements tracked here survive
	 * phase transitions.  May return Destroyable(s) (or a promise of them) which
	 * are auto-tracked in the persistent layer, mirroring phase handlers.  For
	 * multi-phase screens, typically ends with `await ctx.go("<initial phase>")`.
	 */
	create: (
		ctx: ScreenCtx<TPhase, E>,
	) => void | Destroyable | Destroyable[] | Promise<void | Destroyable | Destroyable[]>;
	/**
	 * Phase handlers — elements tracked inside a handler are destroyed on the
	 * next transition or on ctx.refresh().  Omit for single-view screens.
	 * Each entry may be a bare handler or `{ handler, transition }` where
	 * `transition.enter` animates the returned elements in and
	 * `transition.exit` animates the outgoing elements out before destroy.
	 */
	phases?: PhaseMap<TPhase, E>;
}): ScreenResult<TPhase, E> {
	let tracker: PhaseTracker<TPhase> | null = null;
	let initialized = false;
	let eventState: { events: E; listeners: (() => void)[] } | null = null;
	let ctxDisposers: (() => void)[] = [];

	const phases = spec.phases ?? {} as PhaseMap<TPhase, E>;

	/** Normalize a phase entry to `{ handler, transition }`. */
	function normalizeEntry(entry: PhaseEntry<TPhase, E>): {
		handler: PhaseHandler<TPhase, E>;
		transition?: PhaseTransition;
	} {
		if (typeof entry === "function") {
			return { handler: entry };
		}
		return entry;
	}

	/**
	 * Auto-track a single Destroyable or an array of Destroyables returned by
	 * a phase handler or by create().  Elements are wrapped in a TrackedGroup
	 * so one map entry cleans up the whole set.  Returns the wrapped group so
	 * transitions can animate the returned elements.
	 */
	function trackReturned(result: Destroyable | Destroyable[]): TrackedGroup {
		const elements = Array.isArray(result) ? result : [result];
		const group = new TrackedGroup();
		for (const el of elements) {
			group.add(el);
		}
		tracker?.track(group);
		return group;
	}

	/**
	 * Run the enter transition for a phase on its returned elements.
	 * The elements are the TrackedGroup's children (the raw returned objects).
	 */
	async function runEnter(entry: { transition?: PhaseTransition }, group: TrackedGroup): Promise<void> {
		if (!entry.transition?.enter) return;
		await entry.transition.enter(group.elements);
	}

	/**
	 * Run the exit transition for the outgoing phase on its returned elements,
	 * then destroy them.  The outgoing elements are the phase's tracked
	 * TrackedGroup(s) — we unwrap their children so the transition animates the
	 * raw returned objects.
	 */
	async function runExit(entry: { transition?: PhaseTransition } | undefined): Promise<void> {
		if (!entry?.transition?.exit) return;
		const groups = tracker?.getPhaseElements() ?? [];
		const elements = groups.flatMap((g) => (g instanceof TrackedGroup ? g.elements : [g]));
		await entry.transition.exit(elements);
	}

	/** Shared body for go() and refresh(): exit → clear → run handler → enter. */
	async function runPhase(phase: TPhase): Promise<void> {
		if (!tracker) return;

		const outgoingEntry = tracker.currentPhase
			? normalizeEntry(phases[tracker.currentPhase])
			: undefined;

		// 1. Exit transition on the outgoing phase's elements (if declared).
		await runExit(outgoingEntry);

		// 2. Destroy the outgoing phase's tracked objects.
		tracker.clearPhase();
		tracker.currentPhase = phase;

		const entry = normalizeEntry(phases[phase]);
		if (!entry.handler) return;

		// 3. Run the new phase handler.
		tracker.beginPhase();
		let group: TrackedGroup | null = null;
		try {
			const result = await entry.handler(ctx);
			if (result) {
				group = trackReturned(result);
			}
		} finally {
			tracker.endPhase();
		}

		// 4. Enter transition on the incoming phase's returned elements (if declared).
		if (group) {
			await runEnter(entry, group);
		}
	}

	const go = async (phase: TPhase): Promise<void> => {
		await runPhase(phase);
	};

	const refresh = async (): Promise<void> => {
		if (!tracker || !tracker.currentPhase) return;
		await runPhase(tracker.currentPhase);
	};

	const ctx: ScreenCtx<TPhase, E> = {
		track: ((obj: Destroyable | Destroyable[], opts?: SingleTrackOpts | ArrayTrackOpts) => {
			tracker?.track(obj, opts);
			return obj;
		}) as ScreenCtx<TPhase, E>["track"],
		findById: (id) => tracker?.findById(id),
		go,
		refresh,
		get currentPhase() {
			return tracker?.currentPhase ?? null;
		},
		onDestroy: (disposer) => {
			ctxDisposers.push(disposer);
		},

		listen: (event, cb) => {
			const dispose = event.listen(cb);
			tracker?.track({ destroy: dispose });
		},

		get events() {
			return eventState?.events as E;
		},
	};

	const result: ScreenResult<TPhase, E> = {
		name: spec.name,

		get events() {
			return eventState?.events as E;
		},

		go,

		currentPhase: () => tracker?.currentPhase ?? null,

		init: () => {
			if (initialized) return;
			initialized = true;
			tracker = new PhaseTracker<TPhase>();
			eventState = spec.events();
		},

		create: async () => {
			result.init();
			const returned = await spec.create(ctx);
			if (returned) {
				trackReturned(returned);
			}
		},

		destroy: () => {
			ctxDisposers.forEach((d) => d());
			ctxDisposers = [];
			if (eventState) {
				eventState.listeners.forEach((d) => d());
				for (const key of Object.keys(eventState.events)) {
					(eventState.events as EventRecord)[key]?.clear();
				}
			}
			eventState = null;
			tracker?.destroyAll();
			tracker = null;
			initialized = false;
		},
	};

	return result;
}

// ---------------------------------------------------------------------------
// screenModule — reduces per-screen export boilerplate
// ---------------------------------------------------------------------------

/**
 * Wraps a ScreenResult in the shape that the ScreenManager expects as a
 * ScreenModule, plus screen-level go / currentPhase / events.
 *
 * Usage in a screen module:
 *   export const { name, events, init, create, destroy, go, currentPhase } =
 *     screenModule(screen, { onDestroy: () => { ... } });
 */
export function screenModule<TPhase extends string, E extends EventRecord>(
	screen: ScreenResult<TPhase, E>,
	options?: { onDestroy?: () => void },
): ScreenModule & {
	/** Always present on the wrapper (ScreenModule marks it optional). */
	init: () => void;
	/** Always present on the wrapper. */
	create: () => Promise<void>;
	/** Always present on the wrapper (ScreenModule marks it optional). */
	destroy: () => void;
	go: (phase: string) => Promise<void>;
	currentPhase: () => TPhase | null;
} {
	const mod = {
		name: screen.name,

		init() {
			screen.init();
		},

		async create() {
			this.init();
			await screen.create();
		},

		destroy() {
			screen.destroy();
			options?.onDestroy?.();
		},

		go: screen.go as (phase: string) => Promise<void>,

		currentPhase: screen.currentPhase,
	};

	return mod;
}

export type { EventRecord };