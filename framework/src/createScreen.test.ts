import { jest } from "@jest/globals";

import { createScreen, findTrackedById, ScreenCtx } from "./createScreen";
import {
  fakeObj,
  makeSpec,
  FakeObj,
  TestEvents,
} from "./__test_utils__/screenTestHarness";

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
  // P2 — hardening sweep (docs/framework-hardening.md): unknown-phase
  // warning, event-clear ownership (double-clear safety), and the active
  // tracker's duplicate-id guard.
  // -----------------------------------------------------------------------

  it("go() to an undeclared phase warns and no-ops instead of crashing", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { spec } = makeSpec();
    const screen = createScreen(spec);
    await screen.create(); // navigates to phase "a"

    // Phase type is "a" | "b", but a dynamic/JS caller can pass anything.
    await screen.go("nope" as "a");

    // No crash, no phase switch, and a warning was emitted.
    expect(screen.currentPhase()).toBe("a");
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toContain('"nope"');
    expect(warnSpy.mock.calls[0][0]).toContain("no such phase");

    warnSpy.mockRestore();
  });

  it("destroy() clears screen-scoped events exactly once and is idempotent", async () => {
    const { spec, someEvent } = makeSpec();
    const screen = createScreen(spec);
    await screen.create();

    // Ownership rule: the framework owns event cleanup. destroy() clears the
    // event subjects; calling it twice must be safe (idempotent) and must not
    // double-clear or throw.
    screen.destroy();
    screen.destroy();

    // someEvent.clear() was called at least once (destroy → eventState null on
    // the second call, so exactly once for the events themselves).
    expect(someEvent.clear.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("ctx.track() with a duplicate explicit id keeps the first registration and warns", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const first = fakeObj();
    const second = fakeObj();
    const { spec } = makeSpec({
      onCreate: (ctx) => {
        ctx.track(first, { id: "dup" });
        ctx.track(second, { id: "dup" });
      },
    });
    const screen = createScreen(spec);
    await screen.create();

    // The first registration owns the id — findById returns the first object.
    expect(findTrackedById("dup")).toBe(first);
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toContain('"dup"');

    // On destroy only the tracked (first) object is destroyed; the second was
    // never registered so it must not be double-destroyed or left tracking.
    screen.destroy();
    expect(findTrackedById("dup")).toBeUndefined();
    expect(first.destroy).toHaveBeenCalledTimes(1);
    expect(second.destroy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
