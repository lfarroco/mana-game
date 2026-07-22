/**
 * Event — typed, self-contained pub/sub primitive.
 *
 * Each event is an independent subject with its own listener set.
 * No EventEmitter, no string keys, no shared state between events.
 *
 * Import and use:
 *   import { createEvent } from "@game/Models";
 *   const clicked = createEvent<{ id: string }>();
 *   const unlisten = clicked.listen(({ id }) => { ... });
 *   await clicked.emit({ id: "foo" });
 *   unlisten();  // clean up
 */

export type Event<T> = {
	/** Subscribe to this event. Returns a disposer function to unsubscribe. */
	listen: (cb: (payload: T) => void | Promise<void>) => () => void;
	/** Emit to all current subscribers (async, awaits returned promises). */
	emit: (payload: T) => Promise<void>;
	/** Remove all subscribers at once. */
	clear: () => void;
};

/** Creates a self-contained typed event. */
export const createEvent = <T>(): Event<T> => {
	const listeners = new Set<(payload: T) => void | Promise<void>>();
	return {
		listen: (cb) => {
			listeners.add(cb);
			return () => { listeners.delete(cb); };
		},
		emit: async (payload) => {
			const promises: Promise<void>[] = [];
			listeners.forEach((cb) => {
				const result = cb(payload);
				if (result instanceof Promise) promises.push(result);
			});
			if (promises.length > 0) await Promise.all(promises);
		},
		clear: () => listeners.clear(),
	};
};
