/**
 * ScreenScene — base class for a screen that is a real Phaser scene.
 *
 * Replaces the `createScreen()` / `ScreenManager` lifecycle with Phaser's own:
 * `scene.start(key)` shuts the outgoing scene down — Phaser destroys its game
 * objects, kills its tweens and clears its timers — and runs `create()` on the
 * incoming scene. Nothing dangles across a restart because Phaser owns the
 * display list, tweens and clock; that is the whole point of the migration away
 * from `@mana/framework`.
 *
 * Caveat: a scene's `events` emitter is NOT cleared on shutdown (only on scene
 * destroy). Any `scene.events.on(...)` subscription a screen adds must be
 * removed in `onScreenShutdown()` — and the emitter should be captured at
 * registration time, since `env.scene` is repointed on the next navigation.
 *
 * What this base adds on top of a plain `Phaser.Scene`:
 *   - repoints `env.scene` at the active screen (the game runs one scene per
 *     screen, but ~all UI code reads `env.scene`)
 *   - emits `GameEvent.screenShown` / `screenHidden` with the screen name
 *   - a hang-proof entrance fade
 *
 * Lifecycle: override `buildScreen()` (not `create()`) and, when a screen has
 * teardown beyond Phaser's automatic cleanup (module-level flags, DOM nodes,
 * `scene.events` subscriptions, subscriptions on module-level events), override
 * `onScreenShutdown()`.
 */

/**
 * Import Phaser explicitly rather than relying on the `Phaser` global the rest
 * of the client uses. The global only exists as a side effect of importing the
 * phaser package, and this module evaluates `extends Phaser.Scene` at load
 * time — so without this import its position in the module graph decides
 * whether Phaser is defined yet (it wasn't, after the framework decommission
 * changed the import order). The explicit import also installs the global for
 * every module evaluated after this one.
 */
import * as Phaser from "phaser";
import { setActiveScene } from "@Env";
import { GameEvent } from "../Events";

/** Duration of the cross-screen fade, in ms. */
export const SCREEN_FADE_MS = 300;
/** Fade colour (black). */
export const SCREEN_FADE_COLOR = 0x000000;

export abstract class ScreenScene extends Phaser.Scene {
	/** App-level screen name used by `GameEvent` and debug probes. */
	readonly screenName: string;

	private hasShutDown = false;
	private readyPromise: Promise<void> = Promise.resolve();
	private resolveReady: (() => void) | null = null;

	/**
	 * @param config Phaser scene config (its `key` is the route name).
	 * @param screenName Optional display/probe name when it differs from the
	 *   Phaser key (e.g. route "crystals" → screen "crystal_selection").
	 */
	constructor(config: string | Phaser.Types.Scenes.SettingsConfig, screenName?: string) {
		super(config);
		this.screenName =
			screenName ?? (typeof config === "string" ? config : (config.key ?? "unknown"));
	}

	/**
	 * Resolves when `buildScreen()` has finished and the entrance fade has
	 * started (or the scene shut down first). `AppRouter` awaits this so a
	 * `go()` resolves only once the incoming screen actually exists — the
	 * contract callers relied on from the old ScreenManager.
	 */
	get ready(): Promise<void> {
		return this.readyPromise;
	}

	/**
	 * True once the scene has shut down. Long-running async builders (e.g. the
	 * lobby's profile fetch) should check this after an `await` before touching
	 * the scene — the player may have navigated away mid-request.
	 */
	protected get isShutDown(): boolean {
		return this.hasShutDown;
	}

	/**
	 * Phaser lifecycle entry point. Do NOT override — implement
	 * `buildScreen()` instead; `create()` owns the shared setup + fade.
	 */
	create(): void {
		// Phaser reuses the scene instance across restarts — reset the per-run
		// lifecycle state before anything else.
		this.hasShutDown = false;
		this.readyPromise = new Promise<void>((resolve) => {
			this.resolveReady = resolve;
		});

		setActiveScene(this);

		// Phaser clears `this.events` on shutdown, but SHUTDOWN itself is the
		// hook that lets module-level state (DOM, flags, @game events) clean up.
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
		this.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown, this);

		void this.runCreate();
	}

	/** Build the screen. May be async; failures are logged, never fatal. */
	protected abstract buildScreen(): void | Promise<void>;

	/** Optional teardown hook. Runs once, on scene shutdown. */
	protected onScreenShutdown(): void {}

	/** Screens that fade themselves in (e.g. the legacy host) return false. */
	protected shouldFadeIn(): boolean {
		return true;
	}

	/** Fade the scene in from black. Public so hosts can defer/override it. */
	revealScreen(): void {
		const { r, g, b } = hexToRgb(SCREEN_FADE_COLOR);
		this.cameras.main.fadeIn(SCREEN_FADE_MS, r, g, b);
	}

	private async runCreate(): Promise<void> {
		try {
			await this.buildScreen();
		} catch (err) {
			console.error(`[ScreenScene:"${this.screenName}"] buildScreen() failed`, err);
		}

		if (this.hasShutDown) return;

		await GameEvent.screenShown.emit({ name: this.screenName });
		if (this.hasShutDown) return;

		if (this.shouldFadeIn()) this.revealScreen();

		this.markReady();
	}

	private handleShutdown(): void {
		if (this.hasShutDown) return;
		this.hasShutDown = true;

		// A screen that shuts down mid-build must still release anyone awaiting
		// its readiness, otherwise navigation could wait forever.
		this.markReady();

		void GameEvent.screenHidden.emit({ name: this.screenName });
		try {
			this.onScreenShutdown();
		} catch (err) {
			console.error(`[ScreenScene:"${this.screenName}"] onScreenShutdown() failed`, err);
		}
	}

	private markReady(): void {
		const resolve = this.resolveReady;
		this.resolveReady = null;
		resolve?.();
	}
}

function hexToRgb(color: number): { r: number; g: number; b: number } {
	return {
		r: (color >> 16) & 0xff,
		g: (color >> 8) & 0xff,
		b: color & 0xff,
	};
}
