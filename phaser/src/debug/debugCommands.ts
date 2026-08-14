/**
 * Debug commands — dev-only helpers exposed on `window.__debug` for quick
 * manual testing from the browser console (dev builds only, `npm run dev`).
 *
 * Usage:
 *
 *   __debug.goGameOver()                 // game over screen (bronze-tier demo)
 *   __debug.goGameOver({ wins: 3 })      // low-win game over (no tier message)
 *   __debug.goGameOver({ wins: 12 })     // game over with infinite-mode subtitle
 *   __debug.goVictory()                  // run-complete victory screen
 *   __debug.goVictory({ wins: 3 })       // victory below any tier (2 buttons)
 *
 * These run the real run-complete flow: run stats are recorded and the
 * persisted session is deleted, exactly as if the run had ended naturally.
 */

import { env } from "@Env";
import { buildRunCompleteSession, type RunCompleteOptions } from "@game/session/runComplete";
import { BattlegroundEvent } from "../Events";
import { getScreenManager } from "../Screens/ScreenManager";

export { buildRunCompleteSession, type RunCompleteOptions } from "@game/session/runComplete";

export type DebugApi = {
	goGameOver: (opts?: RunCompleteOptions) => Promise<void>;
	goVictory: (opts?: RunCompleteOptions) => Promise<void>;
};

const goToRunCompletePhase = async (
	phase: "game_over" | "victory",
	opts: RunCompleteOptions = {}
): Promise<void> => {
	const previousPhase = env.state.session.phase;
	const session = buildRunCompleteSession(env.state.session, phase, opts);
	env.updateState({ ...env.state, session });

	const current = getScreenManager().current();
	if (current?.name === "battleground") {
		// Already on the battleground screen — re-run the phase transition.
		await BattlegroundEvent.phaseFinished.emit({ previousPhase });
	} else {
		// Enter the battleground; its create() picks up session.phase and jumps to it.
		await getScreenManager().go("battleground");
	}

	console.info(
		`[debug] Set session to "${phase}" phase (wins=${session.wins}, losses=${session.losses}).`
	);
};

export function installDebugCommands(): void {
	if (!__DEV__ || typeof window === "undefined") return;

	const debug = (window as Window & { __debug?: DebugApi }).__debug ?? ({} as DebugApi);
	debug.goGameOver = (opts) => goToRunCompletePhase("game_over", opts);
	debug.goVictory = (opts) => goToRunCompletePhase("victory", opts);
	(window as Window & { __debug?: DebugApi }).__debug = debug;

	console.info("[debug] Debug commands installed: __debug.goGameOver(), __debug.goVictory()");
}
