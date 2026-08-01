/**
 * Router — typed navigation helper.
 *
 * Provides a thin, engine-agnostic wrapper around the ScreenManager's `go()`
 * so screens can navigate with fully-typed route params without importing the
 * manager directly.  The host application registers the manager once at boot.
 */

import type { ScreenModule } from "./Screen";
import type { ScreenManager, Routes } from "./ScreenManager";

let manager: ScreenManager | null = null;

/** Register the active ScreenManager (called once at boot by the host). */
export function setRouter(m: ScreenManager): void {
	manager = m;
}

/** Navigate to a route with typed params. Throws if the router isn't registered. */
export function go<RouteMap extends Routes, R extends keyof RouteMap & string>(
	route: R,
	params?: RouteMap[R] extends void ? void : RouteMap[R],
): Promise<void> {
	if (!manager) {
		throw new Error("Router not initialized — call setRouter() at boot.");
	}
	return manager.go(route, params as never);
}

/** The currently active screen module, or null before the first navigation. */
export function currentScreen(): ScreenModule | null {
	return manager?.current() ?? null;
}