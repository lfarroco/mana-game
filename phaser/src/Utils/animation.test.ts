/**
 * Tests for the hang-proof animation helpers.
 *
 * Regression: `animation.tween` / `animation.delay` used to resolve only from
 * Phaser callbacks. ScreenManager's teardown calls `tweens.killAll()` and
 * `time.removeAllEvents()`, which destroy tweens/timers WITHOUT firing their
 * callbacks — so an awaited transition tween or summon delay hung forever,
 * freezing the battleground phase chain ("click anything and the screen fails
 * to go to the next screen" while the session still advanced).
 */
import { env } from "@Env";
import { delay, tween } from "./animation";

jest.mock("@Env", () => {
	const tweenConfigs: Array<Record<string, unknown>> = [];
	const timerConfigs: Array<Record<string, unknown>> = [];
	const env = {
		scene: {
			tweens: {
				add: jest.fn((config: Record<string, unknown>) => {
					tweenConfigs.push(config);
				}),
			},
			time: {
				addEvent: jest.fn((config: Record<string, unknown>) => {
					timerConfigs.push(config);
				}),
			},
		},
		__tweenConfigs: tweenConfigs,
		__timerConfigs: timerConfigs,
	};
	return { env };
});

const tweenConfigs = (): Array<Record<string, unknown>> =>
	(env as unknown as { __tweenConfigs: Array<Record<string, unknown>> }).__tweenConfigs;
const timerConfigs = (): Array<Record<string, unknown>> =>
	(env as unknown as { __timerConfigs: Array<Record<string, unknown>> }).__timerConfigs;

const fakeTarget = () => ({ x: 0, y: 0, alpha: 1 }) as unknown as Phaser.GameObjects.GameObject;

describe("animation.tween", () => {
	beforeEach(() => {
		tweenConfigs().length = 0;
		timerConfigs().length = 0;
		jest.useRealTimers();
	});

	it("resolves when the tween completes normally", async () => {
		const p = tween({ targets: [fakeTarget()], duration: 100 });

		const config = tweenConfigs()[0];
		expect(typeof config.onComplete).toBe("function");
		(config.onComplete as () => void)();

		await expect(p).resolves.toBeUndefined();
	});

	it("resolves via the fallback when the tween is killed without onComplete", async () => {
		jest.useFakeTimers();

		const p = tween({ targets: [fakeTarget()], duration: 100, delay: 50 });

		// Phaser's killAll()/killTweensOf() destroy tweens without firing
		// onComplete — simulate that by never invoking the captured callback.
		expect(tweenConfigs()[0].onComplete).toBeDefined();
		jest.advanceTimersByTime(50 + 100 + 999);
		// Not resolved yet — the fallback hasn't elapsed.
		await expect(
			Promise.race([p.then(() => "resolved"), Promise.resolve("pending")])
		).resolves.toBe("pending");

		jest.advanceTimersByTime(1);
		await expect(p).resolves.toBeUndefined();
	});

	it("resolves immediately when there are no targets", async () => {
		await expect(tween({ targets: [] })).resolves.toBeUndefined();
	});
});

describe("animation.delay", () => {
	beforeEach(() => {
		tweenConfigs().length = 0;
		timerConfigs().length = 0;
		jest.useRealTimers();
	});

	it("resolves when the timer event fires", async () => {
		const p = delay(50);

		const config = timerConfigs()[0];
		expect(typeof config.callback).toBe("function");
		(config.callback as () => void)();

		await expect(p).resolves.toBeUndefined();
	});

	it("resolves via the fallback when the timer event is removed", async () => {
		jest.useFakeTimers();

		const p = delay(50);

		// time.removeAllEvents() removes timers without firing their callbacks —
		// simulate that by never invoking the captured callback.
		expect(timerConfigs()[0].callback).toBeDefined();
		jest.advanceTimersByTime(50 + 999);
		await expect(
			Promise.race([p.then(() => "resolved"), Promise.resolve("pending")])
		).resolves.toBe("pending");

		jest.advanceTimersByTime(1);
		await expect(p).resolves.toBeUndefined();
	});
});
