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
 *
 * E2E smoke-test controller (see e2e/smoke.e2e.ts):
 *
 *   __debug.clickSinglePlayer()          // title → single-player submenu
 *   __debug.clickNewRun()                // → crystal selection
 *   __debug.clickPlay()                  // create a new run → battleground
 *   __debug.selectOption(0)              // take the first encounter/shop option
 *   __debug.skip()                       // skip a drag-only encounter (upgrade orb, ...)
 *   __debug.replayCombat()               // replay the finished match
 *   __debug.continueCombat()             // proceed past combat results
 *   __debug.getScreen()                  // current screen name
 *   __debug.getScreenPhase()             // active sub-phase of the current screen
 *   __debug.getPhase()                   // current session phase
 *   __debug.getOptions()                 // current options' ids
 */

import { env } from "@Env";
import { buildRunCompleteSession, type RunCompleteOptions } from "@game/session/runComplete";
import { BattlegroundEvent } from "../Events";
import { getScreenManager } from "../Screens/ScreenManager";
import { dispatchAction } from "../Screens/Battleground/BattlegroundScreen";
import { purchaseShopUnit } from "../Screens/Battleground/Phases/Shop/purchaseShopUnit";
import { startNewGame } from "../Screens/CrystalSelection/Effects";

export { buildRunCompleteSession, type RunCompleteOptions } from "@game/session/runComplete";

export type DebugApi = {
	goGameOver: (opts?: RunCompleteOptions) => Promise<void>;
	goVictory: (opts?: RunCompleteOptions) => Promise<void>;

	// --- E2E smoke-test controller (e2e/smoke.e2e.ts) -----------------------
	// Each operation drives the same code path as the matching UI button/card,
	// so the smoke test exercises the real phase-transition + rendering
	// pipeline without depending on screen layout.

	/** Title screen → single-player submenu (same as the "Single Player" button). */
	clickSinglePlayer: () => Promise<void>;
	/** Single-player submenu → crystal selection (same as the "New Run" button). */
	clickNewRun: () => Promise<void>;
	/** Crystal selection → new battleground run (same as the "Play" button). */
	clickPlay: () => Promise<void>;
	/**
	 * Take the option at the given index of the current phase:
	 *  - encounter/pre_combat/upgrade phases → select_encounter
	 *  - shop → recruit/upgrade the card (click-purchase path)
	 * Throws in orb_shop, which requires a drag instead.
	 */
	selectOption: (index: number) => Promise<void>;
	/** Skip the current phase (encounter/shop/orb_shop/upgrade phases). */
	skip: () => Promise<void>;
	/** Combat results → replay the match (same as the "Replay" button). */
	replayCombat: () => Promise<void>;
	/** Combat results → end combat and proceed (same as the "Continue" button). */
	continueCombat: () => Promise<void>;

	// --- Read-only state probes ----------------------------------------------

	/** Current screen name (e.g. "title", "crystal_selection", "battleground"). */
	getScreen: () => string | null;
	/** Active sub-phase of the current screen (e.g. "combat_victory"). */
	getScreenPhase: () => string | null;
	/** Current session phase ("encounter", "shop", "pre_combat", "combat", ...). */
	getPhase: () => string;
	/** IDs of the current phase's options (encounter cards, shop cards, ...). */
	getOptions: () => string[];
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

// ---------------------------------------------------------------------------
// E2E smoke-test controller — programmatically drives the real game flows.
// ---------------------------------------------------------------------------

const clickSinglePlayer = async (): Promise<void> => {
	const current = getScreenManager().current();
	if (current?.name !== "title" || !current.go) {
		throw new Error("[debug] clickSinglePlayer(): title screen is not active.");
	}
	await current.go("singleplayer_submenu");
};

const clickNewRun = async (): Promise<void> => {
	await getScreenManager().go("crystals");
};

const clickPlay = async (): Promise<void> => {
	const current = getScreenManager().current();
	if (current?.name !== "crystal_selection") {
		throw new Error("[debug] clickPlay(): crystal selection screen is not active.");
	}
	await startNewGame();
};

const selectOption = async (index: number): Promise<void> => {
	const { session } = env.state;
	const option = session.options[index];
	if (!option) {
		throw new Error(
			`[debug] selectOption(${index}): no option available (phase="${session.phase}", options=${session.options.length}).`
		);
	}

	if (session.phase === "orb_shop") {
		throw new Error(
			"[debug] selectOption(): orb_shop requires dragging the orb onto a unit — use skip() instead."
		);
	}

	if (session.phase === "shop") {
		// Same click-purchase path as the shop cards (recruits to an empty slot).
		await purchaseShopUnit({
			cardId: option.id,
			shopCharaId: "__debug__",
			targetSlot: null,
		});
		return;
	}

	// encounter / pre_combat / upgrade_core / add_reaction_core
	await dispatchAction({ type: "select_encounter", encounterId: option.id });
};

const skip = async (): Promise<void> => {
	await dispatchAction({ type: "skip" });
};

const replayCombat = async (): Promise<void> => {
	await BattlegroundEvent.combatReplayRequested.emit();
};

const continueCombat = async (): Promise<void> => {
	await BattlegroundEvent.combatContinueRequested.emit();
};

const getScreen = (): string | null => getScreenManager().current()?.name ?? null;

const getScreenPhase = (): string | null => getScreenManager().current()?.currentPhase?.() ?? null;

const getPhase = (): string => env.state.session.phase;

const getOptions = (): string[] => env.state.session.options.map((o) => o.id);

export function installDebugCommands(): void {
	if (!__DEV__ || typeof window === "undefined") return;

	const debug = (window as Window & { __debug?: DebugApi }).__debug ?? ({} as DebugApi);

	debug.goGameOver = (opts) => goToRunCompletePhase("game_over", opts);
	debug.goVictory = (opts) => goToRunCompletePhase("victory", opts);

	debug.clickSinglePlayer = clickSinglePlayer;
	debug.clickNewRun = clickNewRun;
	debug.clickPlay = clickPlay;
	debug.selectOption = selectOption;
	debug.skip = skip;
	debug.replayCombat = replayCombat;
	debug.continueCombat = continueCombat;

	debug.getScreen = getScreen;
	debug.getScreenPhase = getScreenPhase;
	debug.getPhase = getPhase;
	debug.getOptions = getOptions;

	(window as Window & { __debug?: DebugApi }).__debug = debug;

	console.info("[debug] Debug commands installed: __debug.goGameOver(), __debug.goVictory()");
}
