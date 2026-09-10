/**
 * AppRouter — cross-screen navigation for the one-scene-per-screen model.
 *
 * `go(route, params)` is the replacement for `getScreenManager().go(...)`.
 * It resolves the route to a Phaser scene and hands the whole screen over:
 *
 *   - migrated routes  → `scene.start(<route>)` (a real `ScreenScene`)
 *   - legacy routes    → `scene.start(LEGACY_HOST_KEY, { route, params })`;
 *     route the request through the injected legacy navigator when the legacy
 *     host is already active, so its sub-screens keep their own nav state
 *
 * Requests that arrive while a transition is in flight are coalesced to the
 * latest target (same semantics as the old nav mutex) — but the transition
 * itself never depends on an animation completing: `fadeOut` resolves on a
 * timeout as well as on `FADE_OUT_COMPLETE`. A fade interrupted by a scene
 * restart can never strand navigation, which is exactly the failure players
 * reported ("the game never moves to the next screen").
 *
 * The legacy navigator is injected via `registerLegacyNavigator()` (done at
 * boot) rather than imported, so this module never imports the legacy screen
 * modules — that keeps the dependency graph acyclic while both worlds coexist.
 */

import { env } from "@Env";
import {
	LEGACY_HOST_KEY,
	type LegacyRoute,
	type ParamsFor,
	type Route,
	isLegacyRoute,
} from "./routes";
import { ScreenScene } from "./ScreenScene";

/** Duration of the cross-screen fade, in ms (matches ScreenScene). */
export const FADE_MS = 300;
/** Fade colour (black). */
export const FADE_COLOR = 0x000000;
/**
 * Extra time allowed on top of FADE_MS before the router proceeds anyway.
 * Guards against a camera fade whose completion event never fires.
 */
const FADE_TIMEOUT_SLACK_MS = 200;
/** Upper bound on how long `go()` waits for the incoming screen to be ready. */
const READY_TIMEOUT_MS = 8000;

/** Minimal view of a legacy screen exposed to the router / debug probes. */
export type ActiveScreenRef = {
	name: string;
	go?: (phase: string) => void | Promise<void>;
	currentPhase?: () => string | null;
};

/** The transitional bridge to the not-yet-migrated `@mana/framework` screens. */
export type LegacyNavigator = {
	go: (route: LegacyRoute, params: unknown) => Promise<void>;
	current: () => ActiveScreenRef | null;
	/** Tear the active legacy screen down and reset the legacy manager. */
	dispose: () => Promise<void>;
};

let legacyNavigator: LegacyNavigator | null = null;

/** Register the legacy bridge (called once at boot — see Scenes/BootScene.ts). */
export function registerLegacyNavigator(navigator: LegacyNavigator): void {
	legacyNavigator = navigator;
}

/**
 * Build a legacy route inside the already-running legacy host. Used by
 * `LegacyHostScene` directly — routing that call back through `go()` would
 * deadlock on the in-flight-transition coalescing.
 */
export function runLegacy(route: LegacyRoute, params: unknown): Promise<void> {
	if (!legacyNavigator) {
		console.warn(`[AppRouter] no legacy navigator registered — "${route}" not built.`);
		return Promise.resolve();
	}
	return legacyNavigator.go(route, params);
}

let transitioning = false;
let queued: { route: Route; params: unknown } | null = null;

/**
 * Navigate to a route. Serialised and coalescing: while a transition is in
 * flight, only the latest requested target runs afterwards (matching the old
 * ScreenManager behaviour so rapid double-clicks can't interleave fades).
 */
export async function go<R extends Route>(route: R, params?: ParamsFor<R>): Promise<void> {
	if (transitioning) {
		queued = { route, params };
		return;
	}

	transitioning = true;
	try {
		let next: { route: Route; params: unknown } | null = { route, params };
		while (next) {
			queued = null;
			await perform(next.route, next.params);
			next = queued;
		}
	} finally {
		transitioning = false;
	}
}

async function perform(route: Route, params: unknown): Promise<void> {
	const scene = env.scene;
	if (!scene || !scene.sys?.settings) {
		console.warn(`[AppRouter] go("${route}") ignored — no active scene.`);
		return;
	}

	const currentKey = scene.sys.settings.key;

	if (isLegacyRoute(route)) {
		// Already inside the legacy world — its manager owns sub-screen
		// navigation (and its own input lock) as it did before the migration.
		if (currentKey === LEGACY_HOST_KEY && legacyNavigator) {
			await legacyNavigator.go(route, params);
			return;
		}

		lockInput(scene);
		await fadeOut(scene);
		await startScene(scene, LEGACY_HOST_KEY, { route, params });
		return;
	}

	// A migrated screen's Phaser key is its route name.
	if (currentKey === route) return;

	lockInput(scene);
	await fadeOut(scene);
	await startScene(scene, route, params ?? {});
}

/** Stop the outgoing screen from reacting to clicks mid-transition. */
function lockInput(scene: Phaser.Scene): void {
	if (scene.input) scene.input.enabled = false;
}

/**
 * Start a scene and wait until it is `ready` (or `READY_TIMEOUT_MS` passes).
 * The timeout is a safety net only — Phaser has already started the scene, so
 * a slow screen delays the *caller's* `go()` promise, never navigation itself.
 */
async function startScene(scene: Phaser.Scene, key: string, data: unknown): Promise<void> {
	const target = scene.scene.get(key);
	// Attach the readiness wait BEFORE starting: `scene.start()` is queued and
	// runs on the next game step, and the CREATE event is what swaps in the
	// fresh per-run `ready` promise.
	const ready = target instanceof ScreenScene ? nextReady(target) : Promise.resolve();

	scene.scene.start(key, data as object | undefined);
	await withTimeout(ready, READY_TIMEOUT_MS, `scene "${key}"`);
}

/** Resolve once the scene's next `create()` has finished building the screen. */
function nextReady(target: ScreenScene): Promise<void> {
	return new Promise<void>((resolve) => {
		target.events.once(Phaser.Scenes.Events.CREATE, () => {
			void target.ready.then(resolve, resolve);
		});
	});
}

/** Resolve when `promise` settles or `ms` elapses, whichever comes first. */
function withTimeout(promise: Promise<void>, ms: number, label: string): Promise<void> {
	return new Promise<void>((resolve) => {
		let settled = false;
		const finish = (timedOut: boolean) => {
			if (settled) return;
			settled = true;
			if (timedOut) console.warn(`[AppRouter] ${label} was not ready after ${ms}ms.`);
			resolve();
		};

		void promise.then(
			() => finish(false),
			() => finish(false)
		);
		setTimeout(() => finish(true), ms);
	});
}

/**
 * Fade the outgoing screen to black. Hang-proof: resolves on
 * FADE_OUT_COMPLETE or after a bounded timeout, whichever comes first.
 */
function fadeOut(scene: Phaser.Scene): Promise<void> {
	return new Promise<void>((resolve) => {
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			resolve();
		};

		const camera = scene.cameras.main;
		camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, finish);

		const { r, g, b } = hexToRgb(FADE_COLOR);
		camera.fade(FADE_MS, r, g, b);

		// A camera fade interrupted by a scene restart may never emit its
		// completion event. Navigation must not depend on it alone.
		setTimeout(finish, FADE_MS + FADE_TIMEOUT_SLACK_MS);
	});
}

/** Phaser key of the scene currently rendering, or null before boot. */
export function currentSceneKey(): string | null {
	return env.scene?.sys?.settings?.key ?? null;
}

/**
 * The active screen as a legacy-compatible reference. Migrated screens expose
 * `go`/`currentPhase` themselves (e.g. TitleScene); returns null before boot.
 */
export function currentScreen(): ActiveScreenRef | null {
	const key = currentSceneKey();
	if (!key) return null;
	if (key === LEGACY_HOST_KEY) return legacyNavigator?.current() ?? null;

	const scene = env.scene as unknown as ActiveScreenRef & { screenName?: string };
	return {
		// ScreenScene carries its own display name (which may differ from the
		// Phaser key, e.g. route "crystals" → "crystal_selection").
		name: scene.screenName ?? key,
		go: scene.go?.bind(scene),
		currentPhase: scene.currentPhase?.bind(scene),
	};
}

/** Tear down whatever screen is active — used by the legacy host on shutdown. */
export function disposeLegacy(): Promise<void> {
	return legacyNavigator?.dispose() ?? Promise.resolve();
}

function hexToRgb(color: number): { r: number; g: number; b: number } {
	return {
		r: (color >> 16) & 0xff,
		g: (color >> 8) & 0xff,
		b: color & 0xff,
	};
}
