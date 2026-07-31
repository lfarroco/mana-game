import { createScreen, findTrackedById, screenModule, ScreenCtx } from "./screenTracking";

// ---------------------------------------------------------------------------
// Fakes — screenTracking has no runtime Phaser imports, so plain objects
// with a destroy() spy stand in for Phaser game objects.
// ---------------------------------------------------------------------------

type FakeObj = Phaser.GameObjects.GameObject & { destroy: jest.Mock };

const fakeObj = (): FakeObj =>
	({ destroy: jest.fn() }) as unknown as FakeObj;

type TestEvents = { someEvent: { clear: jest.Mock } };

type PhaseReturn = void | FakeObj | FakeObj[];

const makeSpec = (overrides?: {
	onCreate?: (ctx: ScreenCtx<"a" | "b">) => void;
	phaseA?: (ctx: ScreenCtx<"a" | "b">) => PhaseReturn;
	phaseB?: (ctx: ScreenCtx<"a" | "b">) => PhaseReturn;
	noPhases?: boolean;
}) => {
	const someEvent = { clear: jest.fn() };
	const disposer = jest.fn();
	const spec = {
		name: "test",
		events: jest.fn(() => ({
			events: { someEvent } as TestEvents,
			listeners: [disposer],
		})),
		create: jest.fn(async (ctx: ScreenCtx<"a" | "b">) => {
			overrides?.onCreate?.(ctx);
			await ctx.go("a");
		}),
		phases: overrides?.noPhases ? undefined : {
			a: jest.fn((ctx: ScreenCtx<"a" | "b">) => {
				return overrides?.phaseA?.(ctx);
			}),
			b: jest.fn((ctx: ScreenCtx<"a" | "b">) => {
				return overrides?.phaseB?.(ctx);
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
		expect(spec.phases!.a).toHaveBeenCalledTimes(1);
	});

	it("phase switch destroys the outgoing phase's tracked objects", async () => {
		let phaseAObj: FakeObj | undefined;
		const { spec } = makeSpec({
			phaseA: (ctx) => {
				phaseAObj = ctx.track(fakeObj(), { id: "a-obj" });
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
				persistent = ctx.track(fakeObj(), { id: "persist" });
			},
			phaseA: (ctx) => {
				ctx.track(fakeObj(), { id: "a-obj" });
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

	it("destroy() runs event listeners, clears events, and allows re-init", async () => {
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
				persistent = ctx.track(fakeObj(), { id: "shared-id" });
			},
			phaseA: (ctx) => {
				phaseObj = ctx.track(fakeObj(), { id: "shared-id" });
			},
		});
		const screen = createScreen(spec);
		await screen.create();
		expect(findTrackedById("shared-id")).toBe(persistent);
		expect(phaseObj).toBeDefined();
	});

	// -----------------------------------------------------------------------
	// ctx.track() with arrays
	// -----------------------------------------------------------------------

	it("ctx.track() accepts an array and tracks all elements", async () => {
		const objs = [fakeObj(), fakeObj(), fakeObj()];
		const { spec } = makeSpec({
			phaseA: (ctx) => {
				ctx.track(objs);
			},
		});
		const screen = createScreen(spec);
		await screen.create();

		objs.forEach((o) => expect(o.destroy).not.toHaveBeenCalled());

		await screen.go("b");
		objs.forEach((o) => expect(o.destroy).toHaveBeenCalledTimes(1));
	});

	it("ctx.track() with idPrefix assigns predictable IDs", async () => {
		const objs = [fakeObj(), fakeObj()];
		const { spec } = makeSpec({
			onCreate: (ctx) => {
				ctx.track(objs, { idPrefix: "dot-" });
			},
		});
		const screen = createScreen(spec);
		await screen.create();

		expect(findTrackedById("dot-0")).toBe(objs[0]);
		expect(findTrackedById("dot-1")).toBe(objs[1]);
	});

	// -----------------------------------------------------------------------
	// Phase handler return values — handlers can return Destroyable(s) instead
	// of calling ctx.track().  The framework wraps them in a TrackedGroup and
	// auto-tracks them.
	// -----------------------------------------------------------------------

	it("phase handler returning a single Destroyable is tracked and destroyed on switch", async () => {
		const returned: FakeObj = fakeObj();
		const { spec } = makeSpec({
			phaseA: () => returned,
		});
		const screen = createScreen(spec);
		await screen.create();

		expect(returned.destroy).not.toHaveBeenCalled();

		await screen.go("b");
		expect(returned.destroy).toHaveBeenCalledTimes(1);
	});

	it("phase handler returning Destroyable[] tracks all elements and destroys on switch", async () => {
		const objs = [fakeObj(), fakeObj(), fakeObj()];
		const { spec } = makeSpec({
			phaseA: () => objs,
		});
		const screen = createScreen(spec);
		await screen.create();

		objs.forEach((o) => expect(o.destroy).not.toHaveBeenCalled());

		await screen.go("b");
		objs.forEach((o) => expect(o.destroy).toHaveBeenCalledTimes(1));
	});

	it("returned elements and ctx.track() elements are both destroyed on phase switch", async () => {
		const returned: FakeObj = fakeObj();
		const tracked: FakeObj = fakeObj();
		const { spec } = makeSpec({
			phaseA: (ctx) => {
				ctx.track(tracked, { id: "tracked" });
				return returned;
			},
		});
		const screen = createScreen(spec);
		await screen.create();

		expect(returned.destroy).not.toHaveBeenCalled();
		expect(tracked.destroy).not.toHaveBeenCalled();

		await screen.go("b");
		expect(returned.destroy).toHaveBeenCalledTimes(1);
		expect(tracked.destroy).toHaveBeenCalledTimes(1);
	});

	it("returned elements are destroyed on ctx.refresh()", async () => {
		let callCount = 0;
		const { spec } = makeSpec({
			phaseA: jest.fn(() => {
				callCount++;
				return [fakeObj(), fakeObj()];
			}),
		});
		const screen = createScreen(spec);
		await screen.create();

		const ctx = (spec.phases!.a as jest.Mock).mock.calls[0][0] as ScreenCtx<"a" | "b">;
		await ctx.refresh();
		expect(callCount).toBe(2);
	});

	// -----------------------------------------------------------------------
	// ctx.refresh()
	// -----------------------------------------------------------------------

	it("ctx.refresh() destroys phase objects and re-runs the handler", async () => {
		let callCount = 0;
		const { spec } = makeSpec({
			phaseA: jest.fn((ctx: ScreenCtx<"a" | "b">) => {
				callCount++;
				ctx.track(fakeObj(), { id: `refresh-obj-${callCount}` });
			}),
		});
		const screen = createScreen(spec);
		await screen.create();
		expect(callCount).toBe(1);
		expect(findTrackedById("refresh-obj-1")).toBeDefined();

		const ctx = (spec.phases!.a as jest.Mock).mock.calls[0][0] as ScreenCtx<"a" | "b">;
		await ctx.refresh();
		expect(callCount).toBe(2);
		expect(findTrackedById("refresh-obj-1")).toBeUndefined();
		expect(findTrackedById("refresh-obj-2")).toBeDefined();
	});

	// -----------------------------------------------------------------------
	// Optional phases (single-view screen)
	// -----------------------------------------------------------------------

	it("works without phases — single-view screen", async () => {
		const spec = {
			name: "single-view",
			events: jest.fn(() => ({
				events: {} as TestEvents,
				listeners: [],
			})),
			create: jest.fn(async (ctx: ScreenCtx<never>) => {
				ctx.track(fakeObj(), { id: "only" });
			}),
		};
		const screen = createScreen(spec);
		await screen.create();

		expect(findTrackedById("only")).toBeDefined();
		expect(screen.currentPhase()).toBeNull();

		screen.destroy();
		expect(findTrackedById("only")).toBeUndefined();
	});

	// -----------------------------------------------------------------------
	// screenModule() helper
	// -----------------------------------------------------------------------

	it("screenModule() produces ScreenModule-compatible exports", async () => {
		const { spec } = makeSpec();
		const screen = createScreen(spec);
		const mod = screenModule(screen);

		expect(mod.name).toBe("test");
		expect(mod.currentPhase()).toBeNull();

		await mod.create();
		expect(mod.currentPhase()).toBe("a");
		expect(mod.go).toBeDefined();

		mod.destroy();
		expect(mod.currentPhase()).toBeNull();
	});

	it("screenModule() onDestroy runs after screen destroy", async () => {
		const { spec } = makeSpec();
		const screen = createScreen(spec);
		const onDestroy = jest.fn();
		const mod = screenModule(screen, { onDestroy });

		await mod.create();
		mod.destroy();
		expect(onDestroy).toHaveBeenCalledTimes(1);
	});
});
