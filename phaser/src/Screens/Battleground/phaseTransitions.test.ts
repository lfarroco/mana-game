/**
 * Tests for the battleground slide transitions.
 *
 * The @Env mock provides a Phaser tween stub that records each tween's
 * start-state (before applying final values), applies the final values
 * synchronously, and fires onComplete — so slideIn/slideOut can be awaited
 * deterministically without real timers.
 */
import { env } from "@Env";
import type { Destroyable } from "@mana/framework";
import { PHASE_TRANSITION_MS, SLIDE_DISTANCE, slideIn, slideOut } from "./phaseTransitions";

jest.mock("@Env", () => {
	const env = {
		scene: {
			tweens: {
				add: jest.fn(
					(config: {
						targets: Array<{ x: number; y: number; alpha: number }>;
						x?: number;
						y?: number;
						alpha?: number;
						onComplete?: () => void;
					}) => {
						// Record the targets' state at tween-start (before final values are
						// applied) so tests can assert the staged offset/alpha.
						const stagedArr = env.__staged as Array<{
							x: number;
							y: number;
							alpha: number;
						}>;
						const t = config.targets[0];
						stagedArr.push({ x: t.x, y: t.y, alpha: t.alpha });
						// Simulate an instantly-completed tween: apply final values, fire onComplete.
						if (config.x !== undefined) config.targets.forEach((o) => (o.x = config.x!));
						if (config.y !== undefined) config.targets.forEach((o) => (o.y = config.y!));
						if (config.alpha !== undefined)
							config.targets.forEach((o) => (o.alpha = config.alpha!));
						config.onComplete?.();
					}
				),
				killTweensOf: jest.fn(),
			},
		},
		__staged: [] as Array<{ x: number; y: number; alpha: number }>,
	};
	return { env };
});

type FakeEl = { x: number; y: number; alpha: number; destroy: jest.Mock };

const fake = (x: number, y: number, alpha = 1): FakeEl => ({
	x,
	y,
	alpha,
	destroy: jest.fn(),
});

const staged = (): Array<{ x: number; y: number; alpha: number }> =>
	(env as unknown as { __staged: Array<{ x: number; y: number; alpha: number }> }).__staged;

const tweenCalls = () => (env.scene.tweens.add as jest.Mock).mock.calls;

describe("phaseTransitions", () => {
	beforeEach(() => {
		(env.scene.tweens.add as jest.Mock).mockClear();
		(env as unknown as { __staged: unknown[] }).__staged = [];
	});

	it("slideIn offsets elements off-screen and tweens them back with a stagger", async () => {
		const a = fake(100, 200);
		const b = fake(100, 500);
		await slideIn([a, b]);

		// Before the tween: x offset by SLIDE_DISTANCE, alpha staged at 0.
		const [st1, st2] = staged();
		expect(st1.x).toBe(100 + SLIDE_DISTANCE);
		expect(st1.alpha).toBe(0);
		expect(st2.x).toBe(100 + SLIDE_DISTANCE);

		// Final values applied by the (mock) tween: back to rest.
		expect(a.x).toBe(100);
		expect(a.alpha).toBe(1);

		// Stagger: second element's delay is later than the first's.
		expect(tweenCalls()[0][0].delay).toBe(0);
		expect(tweenCalls()[1][0].delay).toBeGreaterThan(0);
		// Duration defaults to PHASE_TRANSITION_MS.
		expect(tweenCalls()[0][0].duration).toBe(PHASE_TRANSITION_MS);
	});

	it("slideOut snapshots resting positions and slides elements off-screen", async () => {
		const a = fake(100, 200);
		await slideOut([a]);

		expect(staged()[0]).toEqual({ x: 100, y: 200, alpha: 1 });
		// Final: slid right + faded out.
		expect(a.x).toBe(100 + SLIDE_DISTANCE);
		expect(a.alpha).toBe(0);
	});

	it("slideIn is restore-aware: it tweens a previously exited element back to its snapshot", async () => {
		const a = fake(100, 200);
		await slideOut([a]); // snapshot (100,200), slides to 190/0
		await slideIn([a]); // restore: tween back to the snapshot

		// The restore tween targets the snapshot position (no re-offset).
		expect(tweenCalls()).toHaveLength(2);
		expect(tweenCalls()[1][0].x).toBe(100);
		expect(a.x).toBe(100);
		expect(a.alpha).toBe(1);
	});

	it("unwraps UIButton-style wrappers and animates their container", async () => {
		const container = fake(300, 400);
		const wrapper = { container, destroy: jest.fn() };
		await slideIn([wrapper as unknown as Destroyable]);

		expect(tweenCalls()).toHaveLength(1);
		expect(staged()[0].x).toBe(300 + SLIDE_DISTANCE);
		expect(container.x).toBe(300);
	});

	it("skips non-animatable destroyables (e.g. the combat phase teardown object)", async () => {
		await slideIn([{ destroy: jest.fn() }]);
		await slideOut([{ destroy: jest.fn() }]);
		expect(env.scene.tweens.add).not.toHaveBeenCalled();
	});

	it("skips already-destroyed elements", async () => {
		const destroyed = {
			x: 100,
			y: 200,
			alpha: 1,
			active: false,
			scene: undefined,
			destroy: jest.fn(),
		};
		await slideIn([destroyed as unknown as Destroyable]);
		expect(env.scene.tweens.add).not.toHaveBeenCalled();
	});

	it("slides elements without an alpha property (e.g. Phaser Shaders) without fading", async () => {
		// Shaders have x/y but no alpha — tweening `alpha: undefined` would make
		// Phaser's tween builder throw (hasOwnProperty on undefined).
		const shader = { x: 100, y: 200, destroy: jest.fn() };

		await slideIn([shader as unknown as Destroyable]);

		// Staged off-set then restored by the (mock) tween.
		expect(shader.x).toBe(100);
		expect(tweenCalls()).toHaveLength(1);
		expect(tweenCalls()[0][0]).not.toHaveProperty("alpha");

		await slideOut([shader as unknown as Destroyable]);

		expect(tweenCalls()[1][0]).not.toHaveProperty("alpha");
		expect(shader.x).toBe(100 + SLIDE_DISTANCE);
	});

	it("compresses the stagger so long element lists finish within a bounded window", async () => {
		const many = Array.from({ length: 12 }, (_, i) => fake(100, 200 + i));
		await slideOut(many);

		const maxDelay = Math.max(...tweenCalls().map((c) => c[0].delay));
		// 12 elements × min stagger 25ms = 275ms — bounded, not 12 × 60ms.
		expect(maxDelay).toBeLessThan(12 * 60);
	});

	it("respects the direction option", async () => {
		const a = fake(100, 200);
		await slideOut([a], { direction: "left" });

		expect(a.x).toBe(100 - SLIDE_DISTANCE);
	});
});
