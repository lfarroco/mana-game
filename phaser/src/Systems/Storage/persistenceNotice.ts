/**
 * persistenceNotice — one-time "your run won't be saved" notice.
 *
 * When the local session store cannot be read or written (blocked storage,
 * quota exceeded, read-only profile) the run keeps playing from memory but is
 * never restored. That used to be invisible: the player simply found no Resume
 * later — or, worse, hit the desync/screen failures caused by the same storage
 * error. Tell them once, on whatever screen is active, and leave it there.
 *
 * Wiring: `BootScene.wireGameEvents()` calls `init()` once at boot (global
 * tier — the payload is plain data only). The notice reads `env.scene` at render
 * time, never at module scope.
 */

import * as Constants from "@Constants";
import * as animation from "@Utils/animation";
import * as i18n from "@i18n/i18n";
import { env } from "@Env";
import { GameEvent } from "../../Events";
import { getPersistenceFailure, hasPersistenceFailed } from "../../SessionManager";

/** How long the notice holds before fading out. */
const NOTICE_HOLD_MS = 6000;
const NOTICE_FADE_IN_MS = 250;
const NOTICE_FADE_OUT_MS = 600;
/** Above panels and modals so it is never hidden behind a phase's UI. */
const NOTICE_DEPTH = 10000;
const NOTICE_BOTTOM_MARGIN = 90;

/** Shown at most once per app launch. */
let shown = false;

/**
 * Subscribe to the persistence failure signal (and pick up a failure that
 * happened before this ran, e.g. during the import-time save load). Returns
 * disposers, matching the `wireGameEvents()` contract.
 */
export function init(): (() => void)[] {
	const showOnce = (payload: { operation: string; detail?: string }) => {
		if (shown) return;
		shown = true;
		renderNotice();
		console.warn(
			"persistenceNotice",
			`Session storage unavailable (${payload.operation}${
				payload.detail ? `: ${payload.detail}` : ""
			}) — progress will not be saved this session.`
		);
	};

	return [
		GameEvent.persistenceUnavailable.listen(showOnce),

		// A failure can be recorded before this module is wired (the session
		// store loads at import time, BootScene runs `init()` later). Surface it
		// on the first real screen instead of the boot scene, which is about to
		// be torn down.
		GameEvent.screenShown.listen(() => {
			if (shown || !hasPersistenceFailed()) return;
			showOnce(getPersistenceFailure() ?? { operation: "session storage" });
		}),
	];
}

/** Reset the one-shot guard (tests only). */
export function resetNoticeForTests(): void {
	shown = false;
}

/**
 * Render the notice at the bottom of the active screen and fade it out. Never
 * throws: a notice failing is strictly better than a notice breaking a screen.
 */
function renderNotice(): void {
	try {
		const scene = env.scene;
		if (!scene?.add) return;

		const text = scene.add
			.text(
				Constants.SCREEN_WIDTH / 2,
				Constants.SCREEN_HEIGHT - NOTICE_BOTTOM_MARGIN,
				i18n.t("storage.notSaved"),
				{
					...Constants.defaultTextConfig,
					fontSize: "24px",
					backgroundColor: "#000000",
					padding: { left: 24, right: 24, top: 12, bottom: 12 },
				}
			)
			.setOrigin(0.5)
			.setDepth(NOTICE_DEPTH)
			.setAlpha(0);

		void animation
			.tween({ targets: [text], alpha: 1, duration: NOTICE_FADE_IN_MS })
			.then(() => animation.delay(NOTICE_HOLD_MS))
			.then(() => animation.tween({ targets: [text], alpha: 0, duration: NOTICE_FADE_OUT_MS }))
			.then(() => text.destroy())
			.catch(() => text.destroy());
	} catch (err) {
		console.warn("persistenceNotice", "Failed to render the notice", err);
	}
}
