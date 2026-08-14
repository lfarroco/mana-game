/**
 * Shared test harness for createScreen tests: fake engine objects with a
 * destroy() spy and the makeSpec() screen-spec factory.  Used by
 * createScreen.test.ts and its split sibling test files.
 */
import { jest } from "@jest/globals";
import type { ScreenCtx } from "../createScreen";

// ---------------------------------------------------------------------------
// Fakes — createScreen has no runtime engine imports, so plain objects
// with a destroy() spy stand in for engine game objects.
// ---------------------------------------------------------------------------

export type FakeObj = { destroy: jest.Mock<() => void | Promise<void>> };

export const fakeObj = (): FakeObj =>
  ({ destroy: jest.fn() }) as unknown as FakeObj;

/** Fake whose destroy() delegates to a custom (possibly async) implementation. */
export const asyncDestroyObj = (impl: () => void | Promise<void>): FakeObj => ({
  destroy: jest.fn(impl),
});

export type TestEvents = { someEvent: { clear: jest.Mock } };

export type PhaseReturn = void | FakeObj | FakeObj[];

export const makeSpec = (overrides?: {
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
    phases: overrides?.noPhases
      ? undefined
      : {
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
