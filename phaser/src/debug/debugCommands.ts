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
import * as Models from "@game/Models";
import { BattlegroundEvent } from "../Events";
import { getScreenManager } from "../Screens/ScreenManager";

export type RunCompleteOptions = {
	/** Wins to display on the results screen. Defaults to the session's wins, or a demo value. */
	wins?: number;
	/** Losses to display. Defaults to the session's losses, or a demo value. */
	losses?: number;
};

export type DebugApi = {
	goGameOver: (opts?: RunCompleteOptions) => Promise<void>;
	goVictory: (opts?: RunCompleteOptions) => Promise<void>;
};

export const buildRunCompleteSession = (
	current: Models.SessionData,
	phase: "game_over" | "victory",
	opts: RunCompleteOptions
): Models.SessionData => {
	const wins = opts.wins ?? (current.wins > 0 ? current.wins : phase === "victory" ? 12 : 6);
	const losses =
		opts.losses ?? (phase === "game_over" ? Math.max(current.losses, 4) : current.losses);

	return {
		...current,
		id: current.id || "debug_session",
		phase,
		wins,
		losses,
		seed: current.seed || "debug-seed-0000-0000",
		initial_seed: current.initial_seed || "debug-seed-0000-0000",
		runStats: current.runStats || {
			damageDealt: 123456,
			poisonDealt: 2345,
			shieldDealt: 6789,
			regenDealt: 4567,
			healDealt: 9876,
			mostPowerfulUnit: { cardId: "mana_crystal", power: 999 },
			totalUnitsRecruited: 14,
			unitUsage: {},
		},
		combatState: undefined,
	};
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
