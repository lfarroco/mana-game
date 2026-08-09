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
});
