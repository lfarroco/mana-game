/**
 * createScreen tests for async lifecycle (P1): async Destroyable teardowns
 * awaited by go()/refresh(), serialised transitions, and self-healing after
 * rejected transitions. Split out of createScreen.test.ts.
 */
import { jest } from "@jest/globals";

import { createScreen, findTrackedById, ScreenCtx } from "./createScreen";
import {
  fakeObj,
  asyncDestroyObj,
  makeSpec,
} from "./__test_utils__/screenTestHarness";

describe("createScreen", () => {
  it("go() awaits the outgoing phase's async destroy before creating the next phase", async () => {
    const order: string[] = [];
    const slowObj = asyncDestroyObj(async () => {
      order.push("destroy-start");
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      order.push("destroy-end");
    });
    const { spec } = makeSpec({
      phaseA: () => slowObj,
      phaseB: (ctx) => {
        order.push("phaseB-create");
        ctx.track(fakeObj(), { id: "b-obj" });
      },
    });
    const screen = createScreen(spec);
    await screen.create();
    expect(order).toEqual([]);

    const ctx = (spec.phases!.a as jest.Mock).mock.calls[0][0] as ScreenCtx<
      "a" | "b"
    >;
    await ctx.go("b");

    // The next phase's handler must not run until the async teardown finished.
    expect(order).toEqual(["destroy-start", "destroy-end", "phaseB-create"]);
    expect(screen.currentPhase()).toBe("b");
  });

  it("ctx.refresh() awaits the current phase's async destroy before re-running the handler", async () => {
    const order: string[] = [];
    let callCount = 0;
    const { spec } = makeSpec({
      phaseA: jest.fn(() => {
        callCount++;
        order.push(`handler-${callCount}`);
        return asyncDestroyObj(async () => {
          order.push(`destroy-start-${callCount}`);
          await new Promise<void>((resolve) => setTimeout(resolve, 10));
          order.push(`destroy-end-${callCount}`);
        });
      }),
    });
    const screen = createScreen(spec);
    await screen.create();
    expect(callCount).toBe(1);

    const ctx = (spec.phases!.a as jest.Mock).mock.calls[0][0] as ScreenCtx<
      "a" | "b"
    >;
    await ctx.refresh();
    expect(callCount).toBe(2);
    expect(order).toEqual([
      "handler-1",
      "destroy-start-1",
      "destroy-end-1",
      "handler-2",
    ]);
  });

  it("two rapid go() calls serialize — the second teardown starts only after the first transition finishes", async () => {
    const order: string[] = [];
    const { spec } = makeSpec({
      phaseA: () => {
        order.push("a-create");
        return asyncDestroyObj(async () => {
          order.push("a-destroy-start");
          await new Promise<void>((resolve) => setTimeout(resolve, 10));
          order.push("a-destroy-end");
        });
      },
      phaseB: () => {
        order.push("b-create");
        return asyncDestroyObj(async () => {
          order.push("b-destroy-start");
          await new Promise<void>((resolve) => setTimeout(resolve, 5));
          order.push("b-destroy-end");
        });
      },
    });
    const screen = createScreen(spec);
    await screen.create();
    expect(order).toEqual(["a-create"]);

    const first = screen.go("b");
    const second = screen.go("a");
    await Promise.all([first, second]);

    // Without serialization, "b-create"/"b-destroy-start" would interleave
    // before "a-destroy-end".
    expect(order).toEqual([
      "a-create",
      "a-destroy-start",
      "a-destroy-end",
      "b-create",
      "b-destroy-start",
      "b-destroy-end",
      "a-create",
    ]);
    expect(screen.currentPhase()).toBe("a");
  });

  it("a rejected async destroy rejects go() but the screen stays usable", async () => {
    const failingObj = asyncDestroyObj(async () => {
      throw new Error("teardown failed");
    });
    const { spec } = makeSpec({
      phaseA: () => failingObj,
      phaseB: (ctx) => {
        ctx.track(fakeObj(), { id: "b-obj" });
      },
    });
    const screen = createScreen(spec);
    await screen.create();

    await expect(screen.go("b")).rejects.toThrow("teardown failed");

    // The screen remains usable — a later go() and refresh() still work.
    await screen.go("b");
    expect(screen.currentPhase()).toBe("b");
    expect(findTrackedById("b-obj")).toBeDefined();

    const ctxB = (spec.phases!.b as jest.Mock).mock.calls[0][0] as ScreenCtx<
      "a" | "b"
    >;
    await ctxB.refresh();
    expect(screen.currentPhase()).toBe("b");
    expect(spec.phases!.b).toHaveBeenCalledTimes(2);
  });

  it("a rejected phase create rejects go() but does not poison later transitions", async () => {
    let bFails = true;
    const { spec } = makeSpec({
      phaseB: (ctx) => {
        if (bFails) {
          bFails = false;
          throw new Error("create failed");
        }
        ctx.track(fakeObj(), { id: "b-obj" });
      },
    });
    const screen = createScreen(spec);
    await screen.create();

    await expect(screen.go("b")).rejects.toThrow("create failed");

    // The per-screen chain self-heals (P1b): the next go() still runs.
    await screen.go("b");
    expect(screen.currentPhase()).toBe("b");
    expect(findTrackedById("b-obj")).toBeDefined();

    // And switching away + back still works.
    await screen.go("a");
    expect(screen.currentPhase()).toBe("a");
    await screen.go("b");
    expect(screen.currentPhase()).toBe("b");
  });
});
