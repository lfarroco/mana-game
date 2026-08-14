/**
 * createScreen tests for ctx.refresh() and phase-scoped ctx.listen()
 * subscriptions. Split out of createScreen.test.ts.
 */
import { jest } from "@jest/globals";

import { createEvent } from "./Event";
import { createScreen, findTrackedById, ScreenCtx } from "./createScreen";
import {
  fakeObj,
  makeSpec,
  TestEvents,
} from "./__test_utils__/screenTestHarness";

describe("createScreen", () => {
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

    const ctx = (spec.phases!.a as jest.Mock).mock.calls[0][0] as ScreenCtx<
      "a" | "b"
    >;
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
    const handler = jest.fn((_: { n: number }) => {});
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
        b: jest.fn(() => {}),
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
    const handler = jest.fn((_: { n: number }) => {});
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
        a: jest.fn(() => {}),
        b: jest.fn(() => {}),
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
    const handler = jest.fn((_: { n: number }) => {});
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
        b: jest.fn(() => {}),
      },
    };
    const screen = createScreen(spec);
    await screen.create();

    const ctx = (spec.phases!.a as jest.Mock).mock.calls[0][0] as ScreenCtx<
      "a" | "b"
    >;
    await ctx.refresh();

    await ev.emit({ n: 1 });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
