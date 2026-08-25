/**
 * createScreen tests for declarative phase transitions (enter/exit
 * animations on returned elements). Split out of createScreen.test.ts.
 */
import { jest } from "@jest/globals";

import { createScreen, ScreenCtx, Destroyable } from "./createScreen";
import {
  fakeObj,
  makeSpec,
  TestEvents,
} from "./__test_utils__/screenTestHarness";

describe("createScreen", () => {
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
        b: jest.fn(() => {}),
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
        b: jest.fn(() => {}),
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
    const enterA = jest.fn(async (_: Destroyable[]) => {});
    const exitA = jest.fn(async (_: Destroyable[]) => {});
    const enterB = jest.fn(async (_: Destroyable[]) => {});
    const exitB = jest.fn(async (_: Destroyable[]) => {});
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
        a: {
          handler: jest.fn(() => aReturned),
          transition: { enter: enterA, exit: exitA },
        },
        b: {
          handler: jest.fn(() => bReturned),
          transition: { enter: enterB, exit: exitB },
        },
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
    const enter = jest.fn(async (_: Destroyable[]) => {});
    const exit = jest.fn(async (_: Destroyable[]) => {});
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
        b: jest.fn(() => {}),
      },
    };
    const screen = createScreen(spec);
    await screen.create();
    expect(enter).toHaveBeenCalledTimes(1);

    const ctx = (spec.phases.a.handler as jest.Mock).mock
      .calls[0][0] as ScreenCtx<"a" | "b">;
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
    const enter = jest.fn(async (_: Destroyable[]) => {});
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
        b: jest.fn(() => {}),
      },
    };
    const screen = createScreen(spec);
    await screen.create();

    expect(enter).toHaveBeenCalledTimes(1);
    const calledWith = enter.mock.calls[0][0] as Destroyable[];
    expect(calledWith).toHaveLength(1);
    expect(calledWith[0]).toBe(returned);
  });

  it("enter transition runs on elements registered via ctx.track, not only returned ones", async () => {
    const tracked = fakeObj();
    const enter = jest.fn(async (elements: Destroyable[]) => {
      expect(elements).toContain(tracked);
    });
    const spec = {
      name: "tracked-enter",
      events: jest.fn(() => ({
        events: {} as TestEvents,
        listeners: [],
      })),
      create: jest.fn(async (ctx: ScreenCtx<"a" | "b">) => {
        await ctx.go("a");
      }),
      phases: {
        a: {
          handler: jest.fn((ctx: ScreenCtx<"a" | "b">) => {
            ctx.track(tracked);
          }),
          transition: { enter },
        },
        b: jest.fn(() => {}),
      },
    };
    const screen = createScreen(spec);
    await screen.create();

    expect(enter).toHaveBeenCalledTimes(1);
    const calledWith = enter.mock.calls[0][0] as Destroyable[];
    expect(calledWith).toContain(tracked);
  });

  it("startPhaseExit runs the exit on the current phase; the next go() skips it", async () => {
    const aReturned = [fakeObj(), fakeObj()];
    const bReturned = [fakeObj()];
    const exitA = jest.fn(async (_: Destroyable[]) => {});
    const enterB = jest.fn(async (_: Destroyable[]) => {});
    const spec = {
      name: "pre-exit",
      events: jest.fn(() => ({
        events: {} as TestEvents,
        listeners: [],
      })),
      create: jest.fn(async (ctx: ScreenCtx<"a" | "b">) => {
        await ctx.go("a");
      }),
      phases: {
        a: {
          handler: jest.fn(() => aReturned),
          transition: { exit: exitA },
        },
        b: {
          handler: jest.fn(() => bReturned),
          transition: { enter: enterB },
        },
      },
    };
    const screen = createScreen(spec);
    await screen.create();

    expect(exitA).not.toHaveBeenCalled();

    await screen.startPhaseExit();

    expect(exitA).toHaveBeenCalledTimes(1);
    // Elements are still tracked (not yet destroyed) after the pre-exit.
    aReturned.forEach((e) => expect(e.destroy).not.toHaveBeenCalled());

    await screen.go("b");

    // The exit already ran — go() must not animate it a second time.
    expect(exitA).toHaveBeenCalledTimes(1);
    expect(enterB).toHaveBeenCalledTimes(1);
    // a's elements were torn down by the phase switch.
    aReturned.forEach((e) => expect(e.destroy).toHaveBeenCalledTimes(1));
  });

  it("startPhaseExit is idempotent while an exit is pending", async () => {
    const aReturned = [fakeObj()];
    const exitA = jest.fn(async (_: Destroyable[]) => {});
    const spec = {
      name: "idempotent-exit",
      events: jest.fn(() => ({
        events: {} as TestEvents,
        listeners: [],
      })),
      create: jest.fn(async (ctx: ScreenCtx<"a" | "b">) => {
        await ctx.go("a");
      }),
      phases: {
        a: {
          handler: jest.fn(() => aReturned),
          transition: { exit: exitA },
        },
        b: jest.fn(() => {}),
      },
    };
    const screen = createScreen(spec);
    await screen.create();

    await screen.startPhaseExit();
    await screen.startPhaseExit();
    expect(exitA).toHaveBeenCalledTimes(1);
  });

  it("restorePhaseExit re-runs the enter on the current phase and re-arms the exit for the next go()", async () => {
    const aReturned = [fakeObj()];
    const enterA = jest.fn(async (_: Destroyable[]) => {});
    const exitA = jest.fn(async (_: Destroyable[]) => {});
    const spec = {
      name: "restore-exit",
      events: jest.fn(() => ({
        events: {} as TestEvents,
        listeners: [],
      })),
      create: jest.fn(async (ctx: ScreenCtx<"a" | "b">) => {
        await ctx.go("a");
      }),
      phases: {
        a: {
          handler: jest.fn(() => aReturned),
          transition: { enter: enterA, exit: exitA },
        },
        b: jest.fn(() => {}),
      },
    };
    const screen = createScreen(spec);
    await screen.create();

    // Initial enter on entering "a".
    expect(enterA).toHaveBeenCalledTimes(1);

    await screen.startPhaseExit();
    expect(exitA).toHaveBeenCalledTimes(1);

    // Restore brings the phase back via enter and clears the pending-exit state.
    await screen.restorePhaseExit();
    expect(enterA).toHaveBeenCalledTimes(2);
    expect(exitA).toHaveBeenCalledTimes(1);

    // A later go() runs exit normally again.
    await screen.go("b");
    expect(exitA).toHaveBeenCalledTimes(2);
  });
});
