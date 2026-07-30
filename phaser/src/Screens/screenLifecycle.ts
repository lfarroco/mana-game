// ---------------------------------------------------------------------------
// ScreenLifecycle — deduplicates the init/destroy/listeners/initialized
// boilerplate shared by TitleScreen, OptionsScreen, and CrystalSelectionScreen.
// ---------------------------------------------------------------------------

/** Minimal shape the lifecycle needs from every event — just clear(). */
interface Clearable {
	clear: () => void;
}

type EventRecord = Record<string, Clearable>;

export type ScreenLifecycle = {
	/**
	 * Idempotent initialisation.  The setup function is only called the first
	 * time; subsequent calls return the already-created events without side
	 * effects.
	 */
	init: <T extends EventRecord>(
		setup: () => { events: T; listeners: (() => void)[] },
	) => T;

	/** Dispose all listeners and clear every event.  Safe to call repeatedly. */
	destroy: () => void;
}

export function createScreenLifecycle(): ScreenLifecycle {
	let listeners: (() => void)[] = [];
	let initialized = false;
	let events: EventRecord | null = null;

	return {
		init<T extends EventRecord>(
			setup: () => { events: T; listeners: (() => void)[] },
		): T {
			if (initialized) return events as T;
			initialized = true;
			const result = setup();
			events = result.events;
			listeners = result.listeners;
			return result.events;
		},

		destroy() {
			listeners.forEach((d) => d());
			listeners = [];
			if (events) {
				for (const key of Object.keys(events)) {
					events[key]?.clear();
				}
			}
			initialized = false;
		},
	};
}
