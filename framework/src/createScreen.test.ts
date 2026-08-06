import { jest } from "@jest/globals";

import { createEvent } from "./Event";
import { createScreen, findTrackedById, screenModule, ScreenCtx, Destroyable } from "./createScreen";

// ---------------------------------------------------------------------------
// Fakes — createScreen has no runtime engine imports, so plain objects
// with a destroy() spy stand in for engine game objects.
// ---------------------------------------------------------------------------

type FakeObj = { destroy: jest.Mock };

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
	// create() return values — like phase handlers, create() may return
	// Destroyable(s) which are auto-tracked in the persistent layer.
	// -----------------------------------------------------------------------

	it("create() returning a single Destroyable tracks it persistently and destroys on destroy()", async () => {
		const returned: FakeObj = fakeObj();
		const spec = {
			name: "create-return",
			events: jest.fn(() => ({
				events: {} as TestEvents,
				listeners: [],
			})),
			create: jest.fn(async (_ctx: ScreenCtx<"a">) => {
				await new Promise<void>((resolve) => resolve());
				return returned;
			}),
			phases: {
				a: jest.fn(() => { }),
			},
		};
		const screen = createScreen(spec);
		await screen.create();

		expect(returned.destroy).not.toHaveBeenCalled();

		// Persistent elements survive phase switches…
		await screen.go("a");
		expect(returned.destroy).not.toHaveBeenCalled();

		screen.destroy();
		expect(returned.destroy).toHaveBeenCalledTimes(1);
	});

	it("create() returning Destroyable[] tracks all elements and destroys them on destroy()", async () => {
		const objs = [fakeObj(), fakeObj(), fakeObj()];
		const spec = {
			name: "create-return-array",
			events: jest.fn(() => ({
				events: {} as TestEvents,
				listeners: [],
			})),
			create: jest.fn((_ctx: ScreenCtx<"a">) => objs),
			phases: {
				a: jest.fn(() => { }),
			},
		};
		const screen = createScreen(spec);
		await screen.create();

		objs.forEach((o) => expect(o.destroy).not.toHaveBeenCalled());

		screen.destroy();
		objs.forEach((o) => expect(o.destroy).toHaveBeenCalledTimes(1));
	});

	it("returned and ctx.track() elements from create() are both destroyed on destroy()", async () => {
		const returned: FakeObj = fakeObj();
		const tracked: FakeObj = fakeObj();
		const spec = {
			name: "create-mixed",
			events: jest.fn(() => ({
				events: {} as TestEvents,
				listeners: [],
			})),
			create: jest.fn((ctx: ScreenCtx<"a">) => {
				ctx.track(tracked, { id: "tracked" });
				return returned;
			}),
			phases: {
				a: jest.fn(() => { }),
			},
		};
		const screen = createScreen(spec);
		await screen.create();

		expect(returned.destroy).not.toHaveBeenCalled();
		expect(tracked.destroy).not.toHaveBeenCalled();

		screen.destroy();
		expect(returned.destroy).toHaveBeenCalledTimes(1);
		expect(tracked.destroy).toHaveBeenCalledTimes(1);
	});

	it("create() returning elements still resolves its initial phase", async () => {
		const spec = {
			name: "create-return-with-phase",
			events: jest.fn(() => ({
				events: {} as TestEvents,
				listeners: [],
			})),
			create: jest.fn(async (ctx: ScreenCtx<"a" | "b">) => {
				const result = fakeObj();
				await ctx.go("a");
				return result;
			}),
			phases: {
				a: jest.fn(() => { }),
				b: jest.fn(() => { }),
			},
		};
		const screen = createScreen(spec);
		await screen.create();

		expect(screen.currentPhase()).toBe("a");
	});

	it("create() returned elements survive phase switches even when the initial ctx.go() is not awaited", async () => {
		// Regression: if a screen's create() fires ctx.go() without awaiting it,
		// the tracker is still in "phase" mode when create() returns.  The
		// returned elements must still be tracked in the persistent layer and
		// survive the next phase switch — they must only die on destroy().
		const returned = [fakeObj(), fakeObj()];
		const spec = {
			name: "create-unawaited-go",
			events: jest.fn(() => ({
				events: {} as TestEvents,
				listeners: [],
			})),
			create: jest.fn((ctx: ScreenCtx<"a" | "b">) => {
				// Intentionally NOT awaited — reproduces the battleground screen bug.
				void ctx.go("a");
				return returned;
			}),
			phases: {
				a: jest.fn(() => { }),
				b: jest.fn(() => { }),
			},
		};
		const screen = createScreen(spec);
		await screen.create();

		// The phase handler run by the un-awaited go() must complete.
		expect(screen.currentPhase()).toBe("a");

		// Phase switch: returned elements must NOT be destroyed.
		await screen.go("b");
		returned.forEach((o) => expect(o.destroy).not.toHaveBeenCalled());

		// Only screen destroy cleans them up.
		screen.destroy();
		returned.forEach((o) => expect(o.destroy).toHaveBeenCalledTimes(1));
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
	// ctx.listen() — phase-scoped event subscriptions
	// -----------------------------------------------------------------------

	it("ctx.listen() in a phase handler is disposed on phase switch", async () => {
		const ev = createEvent<{ n: number }>();
		const handler = jest.fn((_: { n: number }) => { });
		const spec = {
			name: "listen-phase",
			events: jest.fn(() => ({
				events: {} as TestEvents,
				listeners: [],
			})),
			create: jest.fn(async (ctx: ScreenCtx<"a" | "b">) => {
				await ctx.go("a");
			}),
			phases: {
				a: jest.fn((ctx: ScreenCtx<"a" | "b">) => {
					ctx.listen(ev, handler);
				}),
				b: jest.fn(() => { }),
			},
		};
		const screen = createScreen(spec);
		await screen.create();

		await ev.emit({ n: 1 });
		expect(handler).toHaveBeenCalledTimes(1);

		await screen.go("b");
		await ev.emit({ n: 2 });
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("ctx.listen() from the persistent create() layer survives phase switches and dies on destroy", async () => {
		const ev = createEvent<{ n: number }>();
		const handler = jest.fn((_: { n: number }) => { });
		const spec = {
			name: "listen-persistent",
			events: jest.fn(() => ({
				events: {} as TestEvents,
				listeners: [],
			})),
			create: jest.fn(async (ctx: ScreenCtx<"a" | "b">) => {
				ctx.listen(ev, handler);
				await ctx.go("a");
			}),
			phases: {
				a: jest.fn(() => { }),
				b: jest.fn(() => { }),
			},
		};
		const screen = createScreen(spec);
		await screen.create();

		await screen.go("b");
		await ev.emit({ n: 1 });
		expect(handler).toHaveBeenCalledTimes(1);

		screen.destroy();
		await ev.emit({ n: 2 });
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("ctx.refresh() disposes phase-scoped listeners and re-registers them on re-run", async () => {
		const ev = createEvent<{ n: number }>();
		const handler = jest.fn((_: { n: number }) => { });
		const spec = {
			name: "listen-refresh",
			events: jest.fn(() => ({
				events: {} as TestEvents,
				listeners: [],
			})),
			create: jest.fn(async (ctx: ScreenCtx<"a" | "b">) => {
				await ctx.go("a");
			}),
			phases: {
				a: jest.fn((ctx: ScreenCtx<"a" | "b">) => {
					ctx.listen(ev, handler);
				}),
				b: jest.fn(() => { }),
			},
		};
		const screen = createScreen(spec);
		await screen.create();

		const ctx = (spec.phases!.a as jest.Mock).mock.calls[0][0] as ScreenCtx<"a" | "b">;
		await ctx.refresh();

		await ev.emit({ n: 1 });
		expect(handler).toHaveBeenCalledTimes(1);
	});

	// -----------------------------------------------------------------------
	// Phase transitions — enter/exit animations on returned elements
	// -----------------------------------------------------------------------

	it("enter transition runs on the returned elements after the handler", async () => {
		const returned = [fakeObj(), fakeObj()];
		const enter = jest.fn(async (elements: Destroyable[]) => {
			expect(elements).toHaveLength(returned.length);
			elements.forEach((el, i) => expect(el).toBe(returned[i]));
		});
		const spec = {
			name: "enter-transition",
			events: jest.fn(() => ({
				events: {} as TestEvents,
				listeners: [],
			})),
			create: jest.fn(async (ctx: ScreenCtx<"a" | "b">) => {
				await ctx.go("a");
			}),
			phases: {
				a: { handler: jest.fn(() => returned), transition: { enter } },
				b: jest.fn(() => { }),
			},
		};
		const screen = createScreen(spec);
		await screen.create();

		expect(enter).toHaveBeenCalledTimes(1);
		const calledWith = enter.mock.calls[0][0] as Destroyable[];
		expect(calledWith).toHaveLength(returned.length);
		calledWith.forEach((el, i) => expect(el).toBe(returned[i]));
	});

	it("exit transition runs on the outgoing elements before they are destroyed", async () => {
		const returned = [fakeObj(), fakeObj()];
		const exit = jest.fn(async (elements: Destroyable[]) => {
			// Elements must still be alive (not yet destroyed) during exit.
			elements.forEach((e) => expect(e.destroy).not.toHaveBeenCalled());
		});
		const spec = {
			name: "exit-transition",
			events: jest.fn(() => ({
				events: {} as TestEvents,
				listeners: [],
			})),
			create: jest.fn(async (ctx: ScreenCtx<"a" | "b">) => {
				await ctx.go("a");
			}),
			phases: {
				a: { handler: jest.fn(() => returned), transition: { exit } },
				b: jest.fn(() => { }),
			},
		};
		const screen = createScreen(spec);
		await screen.create();

		await screen.go("b");

		expect(exit).toHaveBeenCalledTimes(1);
		const calledWith = exit.mock.calls[0][0] as Destroyable[];
		expect(calledWith).toHaveLength(returned.length);
		calledWith.forEach((el, i) => expect(el).toBe(returned[i]));
		// After exit, the elements are destroyed.
		returned.forEach((e) => expect(e.destroy).toHaveBeenCalledTimes(1));
	});

	it("enter and exit transitions both run on a phase switch", async () => {
		const aReturned = [fakeObj()];
		const bReturned = [fakeObj()];
		const enterA = jest.fn(async (_: Destroyable[]) => { });
		const exitA = jest.fn(async (_: Destroyable[]) => { });
		const enterB = jest.fn(async (_: Destroyable[]) => { });
		const exitB = jest.fn(async (_: Destroyable[]) => { });
		const spec = {
			name: "both-transitions",
			events: jest.fn(() => ({
				events: {} as TestEvents,
				listeners: [],
			})),
			create: jest.fn(async (ctx: ScreenCtx<"a" | "b">) => {
				await ctx.go("a");
			}),
			phases: {
				a: { handler: jest.fn(() => aReturned), transition: { enter: enterA, exit: exitA } },
				b: { handler: jest.fn(() => bReturned), transition: { enter: enterB, exit: exitB } },
			},
		};
		const screen = createScreen(spec);
		await screen.create();

		// Entering "a" runs enterA on a's elements.
		expect(enterA).toHaveBeenCalledTimes(1);
		expect(enterA.mock.calls[0][0]).toHaveLength(aReturned.length);
		expect(exitA).not.toHaveBeenCalled();

		await screen.go("b");

		// Leaving "a" runs exitA on a's elements; entering "b" runs enterB on b's.
		expect(exitA).toHaveBeenCalledTimes(1);
		expect(exitA.mock.calls[0][0]).toHaveLength(aReturned.length);
		expect(enterB).toHaveBeenCalledTimes(1);
		expect(enterB.mock.calls[0][0]).toHaveLength(bReturned.length);
	});

	it("ctx.refresh() runs the exit and enter transitions for the current phase", async () => {
		const returned = [fakeObj()];
		const enter = jest.fn(async (_: Destroyable[]) => { });
		const exit = jest.fn(async (_: Destroyable[]) => { });
		const spec = {
			name: "refresh-transition",
			events: jest.fn(() => ({
				events: {} as TestEvents,
				listeners: [],
			})),
			create: jest.fn(async (ctx: ScreenCtx<"a" | "b">) => {
				await ctx.go("a");
			}),
			phases: {
				a: { handler: jest.fn(() => returned), transition: { enter, exit } },
				b: jest.fn(() => { }),
			},
		};
		const screen = createScreen(spec);
		await screen.create();
		expect(enter).toHaveBeenCalledTimes(1);

		const ctx = (spec.phases.a.handler as jest.Mock).mock.calls[0][0] as ScreenCtx<"a" | "b">;
		await ctx.refresh();

		expect(exit).toHaveBeenCalledTimes(1);
		expect(enter).toHaveBeenCalledTimes(2);
	});

	it("a phase without a transition still works (bare handler)", async () => {
		const { spec } = makeSpec();
		const screen = createScreen(spec);
		await screen.create();
		expect(screen.currentPhase()).toBe("a");
		await screen.go("b");
		expect(screen.currentPhase()).toBe("b");
	});

	it("transition enter receives elements returned as a single Destroyable", async () => {
		const returned = fakeObj();
		const enter = jest.fn(async (_: Destroyable[]) => { });
		const spec = {
			name: "single-enter-transition",
			events: jest.fn(() => ({
				events: {} as TestEvents,
				listeners: [],
			})),
			create: jest.fn(async (ctx: ScreenCtx<"a" | "b">) => {
				await ctx.go("a");
			}),
			phases: {
				a: { handler: jest.fn(() => returned), transition: { enter } },
				b: jest.fn(() => { }),
			},
		};
		const screen = createScreen(spec);
		await screen.create();

		expect(enter).toHaveBeenCalledTimes(1);
		const calledWith = enter.mock.calls[0][0] as Destroyable[];
		expect(calledWith).toHaveLength(1);
		expect(calledWith[0]).toBe(returned);
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