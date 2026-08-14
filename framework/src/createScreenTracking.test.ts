/**
 * createScreen tests for element tracking: findTrackedById, array tracking,
 * idPrefix, and returned-Destroyable auto-tracking from phase handlers and
 * create(). Split out of createScreen.test.ts.
 */
import { jest } from "@jest/globals";

import { createScreen, findTrackedById, ScreenCtx } from "./createScreen";
import {
  fakeObj,
  makeSpec,
  FakeObj,
  TestEvents,
} from "./__test_utils__/screenTestHarness";

describe("createScreen", () => {
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

    const ctx = (spec.phases!.a as jest.Mock).mock.calls[0][0] as ScreenCtx<
      "a" | "b"
    >;
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
        a: jest.fn(() => {}),
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
        a: jest.fn(() => {}),
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
        a: jest.fn(() => {}),
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
        a: jest.fn(() => {}),
        b: jest.fn(() => {}),
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
        a: jest.fn(() => {}),
        b: jest.fn(() => {}),
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
});
