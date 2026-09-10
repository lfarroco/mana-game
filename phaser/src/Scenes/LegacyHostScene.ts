/**
 * LegacyHostScene — the transitional Phaser scene that hosts the
 * not-yet-migrated `@mana/framework` screens.
 *
 * `AppRouter` starts it with `{ route, params }`; `buildScreen()` repoints
 * `env.scene` (via the ScreenScene base) and asks the legacy navigator to
 * build that screen inside this scene. Navigation *between* legacy screens is
 * handled by the legacy manager without re-entering this scene.
 *
 * On shutdown (i.e. when navigation hands over to a migrated scene) it
 * disposes the active legacy screen so its cleanup runs and the manager is
 * recreated fresh next time.
 */

import { disposeLegacy, registerLegacyNavigator, runLegacy } from "./AppRouter";
import { createLegacyNavigator } from "./legacyScreens";
import { LEGACY_HOST_KEY, type LegacyHostData } from "./routes";
import { ScreenScene } from "./ScreenScene";

// Register the bridge as soon as this module loads (main.ts imports it for the
// scene list). AppRouter must not import legacyScreens directly — that would
// make the dependency graph cyclic while both worlds coexist.
registerLegacyNavigator(createLegacyNavigator());

export class LegacyHostScene extends ScreenScene {
	constructor() {
		super({ key: LEGACY_HOST_KEY });
	}

	/** The host fades in itself once the legacy screen has been built. */
	protected shouldFadeIn(): boolean {
		return false;
	}

	protected async buildScreen(): Promise<void> {
		const data = this.sys.settings.data as LegacyHostData | undefined;
		const route = data?.route;
		if (!route) {
			console.warn("[LegacyHostScene] started without a legacy route — nothing to show.");
			return;
		}

		// Build the legacy screen directly through the navigator: routing this
		// back through `go()` would trip the in-flight-transition coalescing.
		await runLegacy(route, data?.params);

		// The legacy manager fades in for legacy→legacy transitions but not for
		// the first entry (no outgoing screen). Reveal the freshly built screen.
		this.revealScreen();
	}

	protected onScreenShutdown(): void {
		void disposeLegacy();
	}
}
