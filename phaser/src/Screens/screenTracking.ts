// ---------------------------------------------------------------------------
// screenTracking — resource-tracking primitives and the createScreen()
// factory.  Phase B of the framework formalization plan
// (docs/framework-formalization.md).
//
// A screen built with createScreen() gets:
//   - idempotent init() + automatic cleanup in destroy()
//     (replaces createScreenLifecycle)
//   - automatic Phaser object tracking via ctx.add(obj, { id })
//   - a persistent layer (spec.create) whose elements survive phase switches
//   - mutually exclusive phases (spec.phases): on every transition the
//     outgoing phase's tracked elements are destroyed automatically
//   - ID-based element recovery via ctx.findById(id) and the module-level
//     findTrackedById(id) for helpers without ctx access
//
// This module has no runtime imports (Phaser types only) so it stays
// unit-testable without the Phaser mock.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Clearable = { clear: () => void };

type EventRecord = Record<string, Clearable>;

/**
 * Minimal shape the tracker needs — anything with a destroy() method.
 * Satisfied by Phaser.GameObjects.GameObject (`destroy(fromScene?)` is
 * assignable to `() => void`) and by plain wrapper objects (e.g.
 * BackgroundOverlay) that manage underlying Phaser resources.
 */
export type Destroyable = { destroy: () => void };

type PhaseMap<TPhase extends string> = Record<
	TPhase,
	(ctx: ScreenCtx<TPhase>) => void | Promise<void>
>;

/** Context handed to a screen's `create` and phase handlers. */
export type ScreenCtx<TPhase extends string = string> = {
	/**
	 * Track a destroyable object.  Objects added in the persistent `create`
	 * layer survive phase transitions; objects added inside a phase handler
	 * are destroyed automatically when the next phase starts.
	 */
	add: <T extends Destroyable>(
		obj: T,
		opts?: { id?: string },
	) => T;

	/** Recover a tracked element by ID (persistent layer first, then current phase). */
	findById: <T extends Destroyable>(id: string) => T | undefined;

	/** Switch phase: destroys the current phase's tracked elements, then runs the phase handler. */
	go: (phase: TPhase) => Promise<void>;

	/** Name of the active phase, or null before the first transition. */
	readonly currentPhase: TPhase | null;

	/** Register a disposer that runs when the screen is destroyed. */
	onDestroy: (disposer: () => void) => void;
};

/** Object returned by createScreen() — satisfies the ScreenModule shape used by Client.ts. */
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
// is serialised by the nav mutex in Client.ts), so a single module-level
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

	/** Track an object in the current scope (persistent layer or active phase). */
	add(obj: Destroyable, id?: string): void {
		const key = id ?? `__tracked_${++this.counter}`;
		const target = this.mode === "phase" ? this.phaseObjects : this.persistent;
		target.set(key, obj);
	}

	findById<T extends Destroyable>(id: string): T | undefined {
		return (
			(this.persistent.get(id) as T | undefined) ??
			(this.phaseObjects.get(id) as T | undefined)
		);
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
	events: () => { events: E; disposers: (() => void)[] };
	/**
	 * Persistent layer — runs once per create(); elements tracked here survive
	 * phase transitions.  Typically ends with `await ctx.go("<initial phase>")`.
	 */
	create: (ctx: ScreenCtx<TPhase>) => void | Promise<void>;
	/** Phase handlers — elements tracked inside a handler are destroyed on the next transition. */
	phases: PhaseMap<TPhase>;
}): ScreenResult<TPhase, E> {
	let tracker: PhaseTracker<TPhase> | null = null;
	let initialized = false;
	let eventState: { events: E; disposers: (() => void)[] } | null = null;
	let ctxDisposers: (() => void)[] = [];

	const go = async (phase: TPhase): Promise<void> => {
		if (!tracker) return;
		tracker.clearPhase();
		tracker.currentPhase = phase;
		const handler = spec.phases[phase];
		if (!handler) return;
		tracker.beginPhase();
		try {
			await handler(ctx);
		} finally {
			tracker.endPhase();
		}
	};

	const ctx: ScreenCtx<TPhase> = {
		add: (obj, opts) => {
			tracker?.add(obj, opts?.id);
			return obj;
		},
		findById: (id) => tracker?.findById(id),
		go,
		get currentPhase() {
			return tracker?.currentPhase ?? null;
		},
		onDestroy: (disposer) => {
			ctxDisposers.push(disposer);
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
			await spec.create(ctx);
		},

		destroy: () => {
			ctxDisposers.forEach((d) => d());
			ctxDisposers = [];
			if (eventState) {
				eventState.disposers.forEach((d) => d());
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

export type { EventRecord };

