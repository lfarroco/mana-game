// ---------------------------------------------------------------------------
// ScreenManager — Phase C of the framework formalization plan
// (docs/framework-formalization.md).
//
// Extracts the navigation logic from Client.ts into a standalone, reusable
// module:
//   - screen registry (route name → ScreenModule)
//   - active screen tracking + nav mutex (serialised, coalescing)
//   - configurable fade transitions
//   - emits GameEvent.screenShown / screenHidden automatically
//   - typed routes with per-route params
//   - deep-link support (e.g. navigate to a specific options tab)
//
// Screens call getScreenManager().go(route, params) instead of emitting
// navigation events. The manager is registered once at boot by
// setScreenManager() (see Client.ts).
// ---------------------------------------------------------------------------

import { env } from "@Env";
import { GameEvent } from "../Events";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal shape a screen must export to be navigable. */
export type ScreenModule = {
	name: string;
	create: () => void | Promise<void>;
	destroy?: () => void;
	init?: () => void;
	/** Optional phase-switch (e.g. options tabs). Used by deep-links. */
	go?: (phase: string) => Promise<void>;
	/** Current sub-state, if the screen supports phases. Used to avoid redundant deep-links. */
	currentPhase?: () => string | null;
};

/** Typed route map — one route per screen, declaring the params it accepts. */
export type Routes = {
	title: void;
	/** crystalId is optional — resume-game navigates without creating a new session. */
	battleground: { crystalId?: string };
	crystals: void;
	options: { tab?: "audio" | "graphics" | "game" };
};

type RouteParams<R extends keyof Routes> = Routes[R] extends void ? void : Routes[R];

export type ScreenManager = {
	/** Navigate to a route, optionally passing typed params. */
	go: <R extends keyof Routes>(route: R, params?: RouteParams<R>) => Promise<void>;
	/** The currently active screen module, or null before the first navigation. */
	current: () => ScreenModule | null;
};

// ---------------------------------------------------------------------------
// Singleton — screens import getScreenManager() to avoid a circular dependency
// on Client.ts (which registers the manager at boot).
// ---------------------------------------------------------------------------

let manager: ScreenManager | null = null;

export function setScreenManager(m: ScreenManager): void {
	manager = m;
}

export function getScreenManager(): ScreenManager {
	if (!manager) {
		throw new Error("ScreenManager not initialized — call setScreenManager() at boot.");
	}
	return manager;
}

/** Test-only reset. */
export function resetScreenManager(): void {
	manager = null;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createScreenManager(config: {
	screens: Record<keyof Routes, ScreenModule>;
	transitions?: { fadeMs?: number; color?: number };
}): ScreenManager {
	const { screens } = config;
	const fadeMs = config.transitions?.fadeMs ?? 300;
	const fadeColor = config.transitions?.color ?? 0x000000;

	let activeScreen: ScreenModule | null = null;
	let navChain: Promise<void> = Promise.resolve();
	let pendingNavTarget: { screen: ScreenModule; params: unknown } | null = null;

	async function doSwitchScreen(screen: ScreenModule, params: unknown): Promise<void> {
		const isFirst = activeScreen === null;

		if (activeScreen) {
			await GameEvent.screenHidden.emit({ name: activeScreen.name });
			if (activeScreen.destroy) {
				activeScreen.destroy();
			}
		}

		// Disable scene input to flush any stale interactive-object references from
		// the InputPlugin (cursors, pointer tracking, registered objects). We re-enable
		// after the new screen is rendered.
		env.scene.input.enabled = false;

		// Skip the fade-out on first load (nothing to fade from).
		if (!isFirst) {
			await env.fadeOut(fadeMs, fadeColor);
		}
		env.scene.children.removeAll(true);
		env.scene.tweens.killAll();
		env.scene.time.removeAllEvents();

		// Reset the default cursor — the howToPlay container on the title screen sets
		// scene.input.setDefaultCursor("pointer") in its pointerover handler, and if
		// the container is destroyed before pointerout fires the cursor stays "pointer"
		// permanently across the whole scene.
		env.scene.input.setDefaultCursor("default");

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
		await GameEvent.screenShown.emit({ name: screen.name });

		if (!isFirst) {
			await env.fadeIn(fadeMs);
		}

		// Re-enable scene input now that the new screen is fully rendered
		env.scene.input.enabled = true;
	}

	async function go<R extends keyof Routes>(route: R, params?: RouteParams<R>): Promise<void> {
		const screen = screens[route];
		if (!screen) return;

		// Already on this screen and no pending navigation — skip immediately.
		if (screen === activeScreen && pendingNavTarget === null) return;

		// Remember the latest target; earlier queued targets will be skipped.
		pendingNavTarget = { screen, params: params as unknown };

		// Chain the navigation after any already-in-flight transition.
		navChain = navChain.then(async () => {
			const target = pendingNavTarget;
			// Nothing pending, or we already landed on it — skip.
			if (!target || target.screen === activeScreen) return;
			pendingNavTarget = null;
			await doSwitchScreen(target.screen, target.params);
		});

		await navChain;
	}

	return {
		go,
		current: () => activeScreen,
	};
}