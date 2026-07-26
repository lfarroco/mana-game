// ---------------------------------------------------------------------------
// ScreenLifecycle — deduplicates the init/destroy/disposers/initialized
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
		setup: () => { events: T; disposers: (() => void)[] },
	) => T;

	/** Dispose all listeners and clear every event.  Safe to call repeatedly. */
	destroy: () => void;
}

export function createScreenLifecycle(): ScreenLifecycle {
	let disposers: (() => void)[] = [];
	let initialized = false;
	let events: EventRecord | null = null;

	return {
		init<T extends EventRecord>(
			setup: () => { events: T; disposers: (() => void)[] },
		): T {
			if (initialized) return events as T;
			initialized = true;
			const result = setup();
			events = result.events;
			disposers = result.disposers;
			return result.events;
		},

		destroy() {
			disposers.forEach((d) => d());
			disposers = [];
			if (events) {
				for (const key of Object.keys(events)) {
					events[key]?.clear();
				}
			}
			initialized = false;
		},
	};
}
