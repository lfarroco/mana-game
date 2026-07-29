import { createScreen, findTrackedById, ScreenCtx } from "./screenTracking";

// ---------------------------------------------------------------------------
// Fakes — screenTracking has no runtime Phaser imports, so plain objects
// with a destroy() spy stand in for Phaser game objects.
// ---------------------------------------------------------------------------

type FakeObj = Phaser.GameObjects.GameObject & { destroy: jest.Mock };

const fakeObj = (): FakeObj =>
	({ destroy: jest.fn() }) as unknown as FakeObj;

type TestEvents = { someEvent: { clear: jest.Mock } };

const makeSpec = (overrides?: {
	onCreate?: (ctx: ScreenCtx<"a" | "b">) => void;
	phaseA?: (ctx: ScreenCtx<"a" | "b">) => void;
	phaseB?: (ctx: ScreenCtx<"a" | "b">) => void;
}) => {
	const someEvent = { clear: jest.fn() };
	const disposer = jest.fn();
	const spec = {
		name: "test",
		events: jest.fn(() => ({
			events: { someEvent } as TestEvents,
			disposers: [disposer],
		})),
		create: jest.fn(async (ctx: ScreenCtx<"a" | "b">) => {
			overrides?.onCreate?.(ctx);
			await ctx.go("a");
		}),
		phases: {
			a: jest.fn((ctx: ScreenCtx<"a" | "b">) => {
				overrides?.phaseA?.(ctx);
			}),
			b: jest.fn((ctx: ScreenCtx<"a" | "b">) => {
				overrides?.phaseB?.(ctx);
			}),
		},
	};
	return { spec, someEvent, disposer };
};

describe("createScreen", () => {
	it("init() is idempotent — events factory runs once", () => {
		const { spec } = makeSpec();
		const screen = createScreen(spec);
		screen.init();
		screen.init();
		expect(spec.events).toHaveBeenCalledTimes(1);
	});

	it("create() auto-inits and enters the initial phase", async () => {
		const { spec } = makeSpec();
		const screen = createScreen(spec);
		await screen.create();
		expect(spec.events).toHaveBeenCalledTimes(1);
		expect(screen.currentPhase()).toBe("a");
		expect(spec.phases.a).toHaveBeenCalledTimes(1);
	});

	it("phase switch destroys the outgoing phase's tracked objects", async () => {
		let phaseAObj: FakeObj | undefined;
		const { spec } = makeSpec({
			phaseA: (ctx) => {
				phaseAObj = ctx.add(fakeObj(), { id: "a-obj" });
			},
		});
		const screen = createScreen(spec);
		await screen.create();
		expect(phaseAObj!.destroy).not.toHaveBeenCalled();

		await screen.go("b");
		expect(phaseAObj!.destroy).toHaveBeenCalledTimes(1);
		expect(screen.currentPhase()).toBe("b");
		expect(findTrackedById("a-obj")).toBeUndefined();
	});

	it("persistent objects survive phase switches, die on destroy()", async () => {
		let persistent: FakeObj | undefined;
		const { spec } = makeSpec({
			onCreate: (ctx) => {
				persistent = ctx.add(fakeObj(), { id: "persist" });
			},
			phaseA: (ctx) => {
				ctx.add(fakeObj(), { id: "a-obj" });
			},
		});
		const screen = createScreen(spec);
		await screen.create();

		await screen.go("b");
		expect(persistent!.destroy).not.toHaveBeenCalled();
		expect(findTrackedById("persist")).toBe(persistent);

		screen.destroy();
		expect(persistent!.destroy).toHaveBeenCalledTimes(1);
		expect(findTrackedById("persist")).toBeUndefined();
	});

	it("destroy() runs event disposers, clears events, and allows re-init", async () => {
		const { spec, someEvent, disposer } = makeSpec();
		const screen = createScreen(spec);
		await screen.create();
		const firstEvents = screen.events;

		screen.destroy();
		expect(disposer).toHaveBeenCalledTimes(1);
		expect(someEvent.clear).toHaveBeenCalledTimes(1);

		await screen.create();
		expect(spec.events).toHaveBeenCalledTimes(2);
		expect(screen.events).not.toBe(firstEvents);
	});

	it("ctx.onDestroy disposers run on destroy()", async () => {
		const ctxDisposer = jest.fn();
		const { spec } = makeSpec({
			onCreate: (ctx) => {
				ctx.onDestroy(ctxDisposer);
			},
		});
		const screen = createScreen(spec);
		await screen.create();
		screen.destroy();
		expect(ctxDisposer).toHaveBeenCalledTimes(1);
	});

	it("findTrackedById prefers persistent layer over phase layer", async () => {
		let persistent: FakeObj | undefined;
		let phaseObj: FakeObj | undefined;
		const { spec } = makeSpec({
			onCreate: (ctx) => {
				persistent = ctx.add(fakeObj(), { id: "shared-id" });
			},
			phaseA: (ctx) => {
				phaseObj = ctx.add(fakeObj(), { id: "shared-id" });
			},
		});
		const screen = createScreen(spec);
		await screen.create();
		expect(findTrackedById("shared-id")).toBe(persistent);
		expect(phaseObj).toBeDefined();
	});
});
