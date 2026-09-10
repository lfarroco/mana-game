/**
 * Legacy screens bridge — the transitional home of the not-yet-migrated
 * `@mana/framework` screens.
 *
 * While the migration is in progress, `battleground`, `crystals`, `options`,
 * `multiplayer_login` and `multiplayer_lobby` still run through
 * `createScreen()` / `createScreenManager()`. They are hosted inside
 * `LegacyHostScene` and reached through the `LegacyNavigator` injected into
 * `AppRouter`.
 *
 * Everything here disappears once the last route in `LEGACY_ROUTES` is
 * migrated; the framework package can then be deleted.
 */

import { env } from "@Env";
import {
	createScreenManager as createFrameworkScreenManager,
	type ScreenModule,
} from "@mana/framework";
import { GameEvent } from "../Events";
import * as BattlegroundScreen from "../Screens/Battleground/BattlegroundScreen";
import type { ActiveScreenRef, LegacyNavigator } from "./AppRouter";
import { FADE_COLOR, FADE_MS } from "./AppRouter";
import type { LegacyRoute } from "./routes";

const screens: Record<LegacyRoute, ScreenModule> = {
	battleground: BattlegroundScreen,
};

type LegacyRoutes = { [R in LegacyRoute]: unknown };

type LegacyManager = ReturnType<typeof createFrameworkScreenManager<LegacyRoutes>>;

/**
 * Build the legacy manager. The hooks mirror the old Phaser ScreenManager
 * adapter: `beforeTransition` emits `screenHidden`, destroys the outgoing
 * screen, fades out and wipes the host scene; `afterTransition` emits
 * `screenShown`, fades in and re-enables input.
 */
function createManager(): LegacyManager {
	let fadeInPending = false;

	return createFrameworkScreenManager<LegacyRoutes>({
		screens,
		hooks: {
			beforeTransition: async (from) => {
				if (from) {
					await GameEvent.screenHidden.emit({ name: from.name });
					from.destroy?.();
				}

				env.scene.input.enabled = false;

				if (from) {
					await env.fadeOut(FADE_MS, FADE_COLOR);
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
					await env.fadeIn(FADE_MS);
				}

				env.scene.input.enabled = true;
			},

			onError: (err) => {
				console.error("[legacy-screens] navigation failed", err);
			},
		},
	});
}

function toActiveScreenRef(screen: ScreenModule): ActiveScreenRef {
	return {
		name: screen.name,
		go: screen.go,
		currentPhase: screen.currentPhase,
	};
}

/**
 * Create the legacy bridge. The manager is created lazily on the first legacy
 * navigation and dropped by `dispose()` when the host scene shuts down, so a
 * re-entry always starts from a clean registry (`activeScreen === null`).
 */
export function createLegacyNavigator(): LegacyNavigator {
	let manager: LegacyManager | null = null;

	const getManager = (): LegacyManager => (manager ??= createManager());

	return {
		go: (route, params) => getManager().go(route, params),

		current: () => {
			const screen = manager?.current();
			return screen ? toActiveScreenRef(screen) : null;
		},

		dispose: async () => {
			const screen = manager?.current();
			// Drop the registry synchronously: the host scene is shutting down,
			// and a navigation arriving while the teardown below is in flight
			// must build a fresh manager rather than reuse the stale one.
			manager = null;

			if (screen) {
				// Same order as beforeTransition: let GameEvent.screenHidden
				// listeners run their cleanup before the screen is destroyed
				// (destroy only unsubscribes them).
				await GameEvent.screenHidden.emit({ name: screen.name });
				screen.destroy?.();
			}
		},
	};
}
