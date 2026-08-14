/**
 * createScreen tests for the screenModule() wrapper. Split out of
 * createScreen.test.ts.
 */
import { jest } from "@jest/globals";

import { createScreen, screenModule } from "./createScreen";
import { makeSpec } from "./__test_utils__/screenTestHarness";

describe("createScreen", () => {
  it("mapDeepLink from the spec is forwarded through screenModule()", async () => {
    const { spec } = makeSpec();
    const mapDeepLink = (params: unknown) =>
      (params as { tab?: string }).tab ?? null;
    const screen = createScreen({ ...spec, mapDeepLink });
    const mod = screenModule(screen);

    expect(mod.mapDeepLink).toBeDefined();
    expect(mod.mapDeepLink!({ tab: "graphics" })).toBe("graphics");
    expect(mod.mapDeepLink!({})).toBeNull();
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
