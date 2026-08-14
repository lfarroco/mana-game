import { jest } from "@jest/globals";

import { createScreenManager, ScreenManagerHooks } from "./ScreenManager";
import type { ScreenModule } from "./Screen";

// ---------------------------------------------------------------------------
// Fakes — the framework ScreenManager is engine-agnostic; hooks carry the
// engine-specific work, so plain screen modules stand in for real screens.
// ---------------------------------------------------------------------------

const makeScreen = (
  name: string,
  overrides?: Partial<ScreenModule>,
): ScreenModule => ({
  name,
  init: jest.fn(),
  create: jest.fn(async () => {}),
  destroy: jest.fn(),
  ...overrides,
});

type TestRoutes = {
  title: void;
  options: { tab?: string };
};

const makeManager = (overrides?: {
  title?: Partial<ScreenModule>;
  options?: Partial<ScreenModule>;
  hooks?: ScreenManagerHooks;
}) =>
  createScreenManager<TestRoutes>({
    screens: {
      title: makeScreen("title", overrides?.title),
      options: makeScreen("options", overrides?.options),
    },
    hooks: overrides?.hooks,
  });

describe("createScreenManager", () => {
  it("navigates to a screen and calls afterTransition", async () => {
    const afterTransition = jest.fn<(to: ScreenModule) => void>();
    const manager = makeManager({ hooks: { afterTransition } });

    await manager.go("title");

    expect(afterTransition).toHaveBeenCalledWith(
      expect.objectContaining({ name: "title" }),
    );
    expect(manager.current()?.name).toBe("title");
  });

  it("calls beforeTransition (host destroys the outgoing screen) on transition", async () => {
    const title = makeScreen("title");
    const options = makeScreen("options");
    const beforeTransition = jest.fn((from: ScreenModule | null) => {
      // The host is responsible for destroying the outgoing screen.
      from?.destroy?.();
    });
    const manager = createScreenManager<TestRoutes>({
      screens: { title, options },
      hooks: { beforeTransition },
    });

    await manager.go("title");
    await manager.go("options");

    expect(beforeTransition).toHaveBeenCalledWith(
      expect.objectContaining({ name: "title" }),
      expect.objectContaining({ name: "options" }),
    );
    expect(title.destroy).toHaveBeenCalledTimes(1);
    expect(manager.current()?.name).toBe("options");
  });

  it("skips navigation when already on the target screen", async () => {
    const title = makeScreen("title");
    const manager = createScreenManager<TestRoutes>({
      screens: { title, options: makeScreen("options") },
    });

    await manager.go("title");
    await manager.go("title");

    expect(title.create).toHaveBeenCalledTimes(1);
  });

  it("coalesces rapid navigations — only the latest target runs", async () => {
    const title = makeScreen("title");
    const options = makeScreen("options");
    const manager = createScreenManager<TestRoutes>({
      screens: { title, options },
    });

    // Fire three navigations back-to-back; the middle one should be skipped.
    const p1 = manager.go("title");
    const p2 = manager.go("options");
    const p3 = manager.go("title");

    await Promise.all([p1, p2, p3]);

    expect(manager.current()?.name).toBe("title");
    expect(options.create).not.toHaveBeenCalled();
  });

  it("deep-links to a phase when the route carries params", async () => {
    const go = jest.fn(async () => {});
    const currentPhase = jest.fn(() => "audio");
    const manager = makeManager({
      options: { go, currentPhase },
    });

    await manager.go("options", { tab: "graphics" });

    expect(go).toHaveBeenCalledWith("graphics");
  });

  it("skips the deep-link when the screen is already on the target phase", async () => {
    const go = jest.fn(async () => {});
    const currentPhase = jest.fn(() => "graphics");
    const manager = makeManager({
      options: { go, currentPhase },
    });

    await manager.go("options", { tab: "graphics" });

    expect(go).not.toHaveBeenCalled();
  });

  it("does not deep-link when the screen has no phase support", async () => {
    const manager = makeManager(); // options has no go/currentPhase
    await manager.go("options", { tab: "graphics" });
    expect(manager.current()?.name).toBe("options");
  });

  // -------------------------------------------------------------------------
  // P0 — nav-mutex failure semantics (docs/framework-hardening.md): a failed
  // transition must not poison the nav chain, current() must not report a
  // destroyed screen, and the failing go() call must still reject to its caller.
  // -------------------------------------------------------------------------

  it("recovers after a failed transition — a later go() still runs the target's create", async () => {
    const optionsCreate = jest.fn(async () => {
      throw new Error("options create failed");
    });
    const titleCreate = jest.fn(async () => {});
    const manager = createScreenManager<TestRoutes>({
      screens: {
        title: makeScreen("title", { create: titleCreate }),
        options: makeScreen("options", { create: optionsCreate }),
      },
    });

    await expect(manager.go("options")).rejects.toThrow("options create failed");

    // Navigation must not be dead: the next go() runs the target's create.
    await expect(manager.go("title")).resolves.toBeUndefined();
    expect(titleCreate).toHaveBeenCalledTimes(1);
    expect(manager.current()?.name).toBe("title");
  });

  it("reports null from current() after a failed transition", async () => {
    const manager = createScreenManager<TestRoutes>({
      screens: {
        title: makeScreen("title", {
          create: jest.fn(async () => {
            throw new Error("boom");
          }),
        }),
        options: makeScreen("options"),
      },
    });

    await expect(manager.go("title")).rejects.toThrow("boom");

    // The outgoing screen may already be destroyed — never report it as active.
    expect(manager.current()).toBeNull();
  });

  it("rejects the original go() call with the original error", async () => {
    const manager = createScreenManager<TestRoutes>({
      screens: {
        title: makeScreen("title", {
          create: jest.fn(async () => {
            throw new Error("original failure");
          }),
        }),
        options: makeScreen("options"),
      },
    });

    await expect(manager.go("title")).rejects.toThrow("original failure");
  });

  it("calls the onError hook with the failure when a transition rejects", async () => {
    const onError = jest.fn<(err: unknown) => void>();
    const manager = createScreenManager<TestRoutes>({
      screens: {
        title: makeScreen("title"),
        options: makeScreen("options", {
          create: jest.fn(async () => {
            throw new Error("create exploded");
          }),
        }),
      },
      hooks: { onError },
    });

    await expect(manager.go("options")).rejects.toThrow("create exploded");

    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][0] as Error).message).toBe("create exploded");
  });

  it("still coalesces rapid navigations after a failure — latest target wins", async () => {
    const optionsCreate = jest.fn(async () => {
      throw new Error("options create failed");
    });
    const titleCreate = jest.fn(async () => {});
    const manager = createScreenManager<TestRoutes>({
      screens: {
        title: makeScreen("title", { create: titleCreate }),
        options: makeScreen("options", { create: optionsCreate }),
      },
    });

    // First navigation fails (options.create rejects).
    await expect(manager.go("options")).rejects.toThrow("options create failed");

    // Fire three navigations back-to-back; the middle one should be skipped.
    const p1 = manager.go("title");
    const p2 = manager.go("options");
    const p3 = manager.go("title");

    await Promise.all([p1, p2, p3]);

    expect(manager.current()?.name).toBe("title");
    expect(titleCreate).toHaveBeenCalledTimes(1);
    expect(optionsCreate).toHaveBeenCalledTimes(1); // only the original failed attempt
  });

  it("returns immediately without throwing when already on the target screen", async () => {
    const title = makeScreen("title");
    const manager = createScreenManager<TestRoutes>({
      screens: { title, options: makeScreen("options") },
    });

    await manager.go("title");

    // Same-screen with no pending navigation: resolves, does not throw.
    await expect(manager.go("title")).resolves.toBeUndefined();
    expect(title.create).toHaveBeenCalledTimes(1);
  });

  it("retries a previously-failed screen on the next go() (dedupe must not skip it)", async () => {
    const optionsCreate = jest
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("first attempt fails"))
      .mockResolvedValueOnce(undefined);
    const manager = createScreenManager<TestRoutes>({
      screens: {
        title: makeScreen("title"),
        options: makeScreen("options", { create: optionsCreate }),
      },
    });

    await expect(manager.go("options")).rejects.toThrow("first attempt fails");

    // activeScreen was reset to null, so the same-screen dedupe must NOT skip
    // a fresh attempt at the previously-failed screen.
    await expect(manager.go("options")).resolves.toBeUndefined();
    expect(optionsCreate).toHaveBeenCalledTimes(2);
    expect(manager.current()?.name).toBe("options");
  });

  it("still deep-links to a phase after a failed transition", async () => {
    const optionsCreate = jest
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("first attempt fails"))
      .mockResolvedValueOnce(undefined);
    const go = jest.fn(async () => {});
    const currentPhase = jest.fn(() => "audio");
    const manager = createScreenManager<TestRoutes>({
      screens: {
        title: makeScreen("title"),
        options: makeScreen("options", { create: optionsCreate, go, currentPhase }),
      },
    });

    await expect(manager.go("options")).rejects.toThrow("first attempt fails");

    await manager.go("options", { tab: "graphics" });

    expect(go).toHaveBeenCalledWith("graphics");
    expect(manager.current()?.name).toBe("options");
  });
});
