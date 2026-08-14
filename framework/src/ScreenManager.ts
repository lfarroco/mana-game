/**
 * ScreenManager — engine-agnostic navigation core.
 *
 * Handles:
 *   - screen registry (route name → ScreenModule)
 *   - active screen tracking + nav mutex (serialised, coalescing)
 *   - typed routes with per-route params
 *   - deep-link support (e.g. navigate to a specific options tab)
 *
 * Engine-specific work (fade transitions, scene cleanup, input handling,
 * global event emission) is injected via `hooks` so this module stays
 * framework-agnostic and unit-testable without any engine mock.
 */

import type { ScreenModule } from "./Screen";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Typed route map — one route per screen, declaring the params it accepts. */
export type Routes = Record<string, unknown>;

type RouteParams<
  RouteMap extends Routes,
  R extends keyof RouteMap,
> = RouteMap[R] extends void ? void : RouteMap[R];

export type ScreenManager<RouteMap extends Routes = Routes> = {
  /** Navigate to a route, optionally passing typed params. */
  go: <R extends keyof RouteMap>(
    route: R,
    params?: RouteParams<RouteMap, R>,
  ) => Promise<void>;
  /** The currently active screen module, or null before the first navigation. */
  current: () => ScreenModule | null;
};

/** Engine-specific hooks injected by the host application (e.g. the Phaser adapter). */
export type ScreenManagerHooks = {
  /**
   * Called before the outgoing screen is destroyed.  The host uses this to
   * emit `screenHidden`, disable input, run fade-out, and clear the scene.
   */
  beforeTransition?: (
    from: ScreenModule | null,
    to: ScreenModule,
  ) => void | Promise<void>;
  /**
   * Called after the incoming screen is created.  The host uses this to
   * emit `screenShown`, run fade-in, and re-enable input.
   */
  afterTransition?: (to: ScreenModule) => void | Promise<void>;
  /**
   * Called when a navigation fails mid-flight (before/after transition or the
   * incoming screen's create).  `activeScreen` has already been reset to null
   * and the original failure is rethrown to the `go()` caller; the host uses
   * this to log or report the error.
   */
  onError?: (err: unknown) => void;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createScreenManager<RouteMap extends Routes>(config: {
  screens: { [R in keyof RouteMap]: ScreenModule };
  hooks?: ScreenManagerHooks;
}): ScreenManager<RouteMap> {
  const { screens } = config;
  const hooks = config.hooks ?? {};

  let activeScreen: ScreenModule | null = null;
  let navChain: Promise<void> = Promise.resolve();
  let pendingNavTarget: { screen: ScreenModule; params: unknown } | null = null;

  async function doSwitchScreen(
    screen: ScreenModule,
    params: unknown,
  ): Promise<void> {
    await hooks.beforeTransition?.(activeScreen, screen);

    // Re-initialize screen-local events if the module has an init()
    screen.init?.();
    await screen.create();

    // Deep-link: if the route carries a sub-state and the screen supports phase
    // switching, navigate to it (e.g. a specific options tab). Skip if the screen
    // is already on that phase to avoid a redundant re-render.
    if (params && typeof params === "object" && "tab" in params && screen.go) {
      const tab = (params as { tab: string }).tab;
      if (screen.currentPhase?.() !== tab) {
        await screen.go(tab);
      }
    }

    activeScreen = screen;
    await hooks.afterTransition?.(screen);
  }

  /**
   * Run the next queued navigation, if any.  This is the nav-chain link:
   * `navChain.then(run, run)` makes the chain self-healing — a failed link
   * rejects the chain, but the rejection handler still runs the next queued
   * target instead of poisoning navigation until reload.
   */
  async function run(): Promise<void> {
    const target = pendingNavTarget;
    // Nothing pending, or we already landed on it — skip.
    if (!target || target.screen === activeScreen) return;
    pendingNavTarget = null;
    try {
      await doSwitchScreen(target.screen, target.params);
    } catch (err) {
      // The outgoing screen may already be destroyed (beforeTransition ran)
      // and the incoming screen half-created — never report either as active.
      // Reset to null, surface the failure to the host, and rethrow so the
      // original go() call still rejects to its caller.
      activeScreen = null;
      hooks.onError?.(err);
      throw err;
    }
  }

  async function go<R extends keyof RouteMap>(
    route: R,
    params?: RouteParams<RouteMap, R>,
  ): Promise<void> {
    const screen = screens[route];
    if (!screen) return;

    // Already on this screen and no pending navigation — skip immediately.
    if (screen === activeScreen && pendingNavTarget === null) return;

    // Remember the latest target; earlier queued targets will be skipped.
    pendingNavTarget = { screen, params: params as unknown };

    // Chain the navigation after any already-in-flight transition.  `then(run, run)`
    // self-heals: if the previous navigation rejected, the rejection handler still
    // runs the next queued target.
    navChain = navChain.then(run, run);

    await navChain;
  }

  return {
    go,
    current: () => activeScreen,
  };
}
