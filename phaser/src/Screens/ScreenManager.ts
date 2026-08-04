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
	go: <R extends keyof Routes>(route: R, params?: RouteParams<R>) => Promise<void>;
	current: () => ScreenModule | null;
};

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

export function resetScreenManager(): void {
	manager = null;
}

export function createScreenManager(config: {
	screens: Record<keyof Routes, ScreenModule>;
	transitions?: { fadeMs?: number; color?: number };
}): ScreenManager {
	const fadeMs = config.transitions?.fadeMs ?? 300;
	const fadeColor = config.transitions?.color ?? 0x000000;

	let fadeInPending = false;

	return createFrameworkScreenManager<Routes>({
		screens: config.screens,
		hooks: {
			beforeTransition: async (from) => {
				if (from) {
					await GameEvent.screenHidden.emit({ name: from.name });
					from.destroy?.();
				}


				env.scene.input.enabled = false;

				if (from) {
					await env.fadeOut(fadeMs, fadeColor);
					fadeInPending = true;
				}
				env.scene.children.removeAll(true);
				env.scene.tweens.killAll();
				env.scene.time.removeAllEvents();


			},

			afterTransition: async (to) => {
				await GameEvent.screenShown.emit({ name: to.name });

				if (fadeInPending) {
					fadeInPending = false;
					await env.fadeIn(fadeMs);
				}

				env.scene.input.enabled = true;
			},
		},
	});
}
