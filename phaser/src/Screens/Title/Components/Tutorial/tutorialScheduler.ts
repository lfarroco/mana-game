/**
 * Tutorial scheduler — one-shot and repeating delays driven by the game loop.
 *
 * Phaser's `scene.time.addEvent` is the obvious tool, but its events advance
 * with `Clock`'s own time scale, which the client sets from the player's *game
 * speed* option (`OptionsStore.setGameSpeed`). On a machine whose stored speed
 * is low a "1 second" status tick in the tutorial took several real seconds,
 * which makes the regen/poison lessons look broken. A tutorial is not gameplay:
 * its timings must be wall-clock, so this module counts real milliseconds off
 * the scene's update loop instead.
 *
 * The update subscription lives for the scheduler's whole lifetime and is only
 * removed by `destroy()`. `cancelAll()` deliberately keeps it: every cast
 * clears the previous status counter and arms a new one, so a `cancelAll()` that
 * unsubscribed would leave the fresh counter silently dead.
 *
 * Callbacks are isolated — one throwing callback must not stop the loop's other
 * subscribers (a frozen update loop is the worst failure mode a tutorial can
 * have, because nothing on screen explains it).
 */

export interface TutorialScheduler {
	/** Run `callback` once after `delayMs` of game time. */
	after(delayMs: number, callback: () => void): void;
	/** Run `callback` every `intervalMs` of game time until cancelled. */
	every(intervalMs: number, callback: () => void): void;
	/** Drop every pending callback but keep the scheduler usable. */
	cancelAll(): void;
	/** Drop every pending callback and detach from the game loop. */
	destroy(): void;
}

/**
 * Create a scheduler bound to the given scene. The scene is read through the
 * injected getter, matching the client's never-capture-`env.scene` rule.
 */
export const createTutorialScheduler = (getScene: () => Phaser.Scene): TutorialScheduler => {
	type Task = {
		remainingMs: number;
		intervalMs: number | null;
		callback: () => void;
	};

	let tasks: Task[] = [];
	const scene = getScene();

	const tick = (_time: number, delta: number) => {
		if (tasks.length === 0) return;

		// Iterate a copy: a callback may schedule more work (a cast arms the next
		// status counter) or cancel everything.
		for (const task of [...tasks]) {
			if (!tasks.includes(task)) continue;
			task.remainingMs -= delta;
			if (task.remainingMs > 0) continue;

			if (task.intervalMs === null) {
				tasks = tasks.filter((t) => t !== task);
			} else {
				task.remainingMs += task.intervalMs;
			}

			try {
				task.callback();
			} catch (error) {
				console.error("[tutorialScheduler] scheduled callback failed", error);
			}
		}
	};

	scene.events.on(Phaser.Scenes.Events.UPDATE, tick);

	return {
		after: (delayMs, callback) => {
			tasks.push({ remainingMs: delayMs, intervalMs: null, callback });
		},
		every: (intervalMs, callback) => {
			tasks.push({ remainingMs: intervalMs, intervalMs, callback });
		},
		cancelAll: () => {
			tasks = [];
		},
		destroy: () => {
			scene.events.off(Phaser.Scenes.Events.UPDATE, tick);
			tasks = [];
		},
	};
};
