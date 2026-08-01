// ---------------------------------------------------------------------------
// ScreenManager — Phaser adapter over the @mana/framework navigation core.
// Phase D of the framework formalization plan (docs/framework-formalization.md).
//
// The framework's createScreenManager() owns the registry, active-screen
// tracking, nav mutex (serialised, coalescing), typed routes, and deep-links.
// This adapter injects the Phaser-specific transition work via hooks:
//   - beforeTransition: emit screenHidden, destroy the outgoing screen,
//     disable input, fade out, clear the scene, reset the cursor
//   - afterTransition: emit screenShown, fade in, re-enable input
//
// It also declares the game's typed route map (Routes) and holds the manager
// singleton.  Screens call getScreenManager().go(route, params); the manager
// is registered once at boot by setScreenManager() (see Client.ts).
// ---------------------------------------------------------------------------

import { env } from "@Env";
import { GameEvent } from "../Events";
import {
	createScreenManager as createFrameworkScreenManager,
	type ScreenModule,
} from "@mana/framework";

export type { ScreenModule } from "@mana/framework";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
	const fadeMs = config.transitions?.fadeMs ?? 300;
	const fadeColor = config.transitions?.color ?? 0x000000;

	// Fades only apply between screens — the first navigation has nothing to
	// fade from, and the boot screen should appear instantly.
	let fadeInPending = false;

	return createFrameworkScreenManager<Routes>({
		screens: config.screens,
		hooks: {
			beforeTransition: async (from) => {
				if (from) {
					await GameEvent.screenHidden.emit({ name: from.name });
					from.destroy?.();
				}

				// Disable scene input to flush any stale interactive-object references
				// from the InputPlugin (cursors, pointer tracking, registered objects).
				// We re-enable after the new screen is rendered.
				env.scene.input.enabled = false;

				// Skip the fade-out on first load (nothing to fade from).
				if (from) {
					await env.fadeOut(fadeMs, fadeColor);
					fadeInPending = true;
				}
				env.scene.children.removeAll(true);
				env.scene.tweens.killAll();
				env.scene.time.removeAllEvents();

				// Reset the default cursor — the howToPlay container on the title screen
				// sets scene.input.setDefaultCursor("pointer") in its pointerover handler,
				// and if the container is destroyed before pointerout fires the cursor
				// stays "pointer" permanently across the whole scene.
				env.scene.input.setDefaultCursor("default");
			},

			afterTransition: async (to) => {
				await GameEvent.screenShown.emit({ name: to.name });

				if (fadeInPending) {
					fadeInPending = false;
					await env.fadeIn(fadeMs);
				}

				// Re-enable scene input now that the new screen is fully rendered
				env.scene.input.enabled = true;
			},
		},
	});
}
