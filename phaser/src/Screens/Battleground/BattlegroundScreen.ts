import * as Board from "@Components/Board/Board";
import * as Chara from "@Systems/Chara/Chara";
import * as Models from "@game/Models";
import * as AudioManager from "@Systems/AudioManager";
import * as Encounter from "./Phases/Encounter/Encounter";

import * as Components from "./Components";
import * as Phases from "./Phases";
import { getRemainingLives } from "../../SessionManager";
import { env } from "@Env";
import { BattlegroundEvent } from "../../Events";
import { getScreenManager } from "../ScreenManager";
import * as UI from "./Components/UI/UI";
import { syncPlayerBoardUnits } from "./playerBoardSync";
import { createScreen, ScreenCtx, screenModule } from "@mana/framework";
import { openOrbShop } from "./Components/Shop/OrbShop";


export type BGPhase = Models.PhaseType;

type BGEvents = typeof BattlegroundEvent

export type BGContext = ScreenCtx<BGPhase, BGEvents>

// ---------------------------------------------------------------------------
// Phase lifecycle types
// ---------------------------------------------------------------------------

/**
 * A function that tears down a phase instance: destroys all UI, disposes
 * event listeners, and resets internal state. Must be idempotent.
 */
export type TeardownFn = () => Promise<void>;

/**
 * Each phase module exports a PhaseHandler describing how to start and
 * tear down the phase. BattlegroundScreen guarantees that teardown
 * runs on every phase transition AND on screen destruction.
 *
 * Phases should create a dedicated Phaser Container for all their UI
 * so disposal is a single `container.destroy(true)` call.
 */
export type PhaseHandler = {
	name: Models.PhaseType;
	start: () => Promise<TeardownFn>;
};

// ---------------------------------------------------------------------------
// Shared phase handlers
// ---------------------------------------------------------------------------

/**
 * Both "encounter" and "pre_combat" display encounter options — the
 * handler itself checks env.state.session.phase to decide whether to
 * show the skip button.
 */
// const EncounterHandler: PhaseHandler = {
// 	name: "encounter",
// 	start: Encounter.startPhase,
// };

// ---------------------------------------------------------------------------
// Phase advancement helpers
// ---------------------------------------------------------------------------

/**
 * Dispatch an action, update state, optionally run a callback, then emit phaseFinished.
 * This is the canonical single-step phase transition used by all phase handlers.
 *
 * @param action - The game action to dispatch through the server adapter.
 * @param onBeforeFinish - Optional callback that fires after state update but before
 *   phaseFinished is emitted. Use for intermediate events (HUD deltas, purchase events, etc.).
 */
export const dispatchAction = async (
	action: Models.Action,
	onBeforeFinish?: (response: Models.ActionResponse) => void | Promise<void>,
): Promise<void> => {
	const previousPhase = env.state.session.phase;
	const response = await env.dispatch(action);
	env.updateState({ ...env.state, ...response });
	if (onBeforeFinish) await onBeforeFinish(response);
	await BattlegroundEvent.phaseFinished.emit({ previousPhase });
};

/**
 * Emit phaseFinished without dispatching an action.
 * Use when state has already been updated (e.g., dispatch happened earlier in the flow).
 *
 * @param previousPhase - The phase BEFORE state was updated. Must be captured by the
 *   caller before calling updateState, otherwise cleanup listeners will receive the
 *   wrong phase and fail to tear down their UI.
 * @param onBeforeFinish - Optional callback that fires before phaseFinished is emitted.
 */
export const finishPhase = async (
	previousPhase: Models.PhaseType,
	onBeforeFinish?: () => void | Promise<void>,
): Promise<void> => {
	if (onBeforeFinish) await onBeforeFinish();
	await BattlegroundEvent.phaseFinished.emit({ previousPhase });
};


// ---------------------------------------------------------------------------
// HUD snapshot (track deltas for HUD animations)
// ---------------------------------------------------------------------------

type SessionHudSnapshot = {
	round: number;
	wins: number;
	lives: number;
};

let previousSessionHudSnapshot: SessionHudSnapshot | null = null;

const createSessionHudSnapshot = (): SessionHudSnapshot => ({
	round: env.state.session.round,
	wins: env.state.session.wins,
	lives: getRemainingLives(env.state.session),
});

function updateHudFromSessionChanges(_payload: { previousPhase: Models.PhaseType }): void {
	const currentSnapshot = createSessionHudSnapshot();

	if (!previousSessionHudSnapshot) {
		previousSessionHudSnapshot = currentSnapshot;
		return;
	}

	const winsDelta = currentSnapshot.wins - previousSessionHudSnapshot.wins;
	if (winsDelta !== 0) {
		BattlegroundEvent.winsChanged.emit({ wins: currentSnapshot.wins, delta: winsDelta });
	}

	const livesDelta = currentSnapshot.lives - previousSessionHudSnapshot.lives;
	if (livesDelta !== 0) {
		BattlegroundEvent.livesChanged.emit({ lives: currentSnapshot.lives, delta: livesDelta });
	}

	if (currentSnapshot.round !== previousSessionHudSnapshot.round) {
		BattlegroundEvent.roundChanged.emit({
			round: currentSnapshot.round,
			delta: currentSnapshot.round - previousSessionHudSnapshot.round,
		});
	}

	previousSessionHudSnapshot = currentSnapshot;
}


// ---------------------------------------------------------------------------
// Framework adapter — bridges the handler-based phase loop into the
// createScreen() lifecycle.
// ---------------------------------------------------------------------------

/**
 * The previous phase's teardown, awaited by transitionToCurrentPhase before
 * the next phase starts.  The `consumed` flag coordinates with the tracker:
 * when the framework destroys the wrapper returned by runPhaseHandler (on
 * the next transition or on screen destruction), the teardown fires only if
 * the loop has not already run it.
 */
let activePhaseCleanup: { teardown: TeardownFn; consumed: boolean } | null = null;

/**
 * Adapts a PhaseHandler to a framework phase handler.  The returned
 * Destroyable registers the teardown with the tracker so it also runs on
 * screen destruction; ordering across transitions is handled by
 * transitionToCurrentPhase, which awaits the teardown before go().
 */
const runPhaseHandler = (handler: PhaseHandler) => async (_ctx: BGContext) => {
	const teardown = await handler.start();
	const cleanup = { teardown, consumed: false };
	activePhaseCleanup = cleanup;
	return {
		destroy: () => {
			if (cleanup.consumed) return;
			cleanup.consumed = true;
			if (activePhaseCleanup === cleanup) activePhaseCleanup = null;
			void teardown();
		},
	};
};

/**
 * The phase loop.  Reads the current phase from session state, syncs the
 * player board (except around combat), awaits the previous phase's
 * teardown, then switches the framework tracker to the new phase.
 * Wired to BattlegroundEvent.phaseFinished and called once from create().
 */
const transitionToCurrentPhase = async ({ previousPhase }: {
	previousPhase?: Models.PhaseType
}) => {
	const phase = env.state.session.phase;

	if (phase !== "combat" && previousPhase !== "combat") {
		await syncPlayerBoardUnits();
	}

	// Tear down previous phase — guaranteed on every transition
	if (activePhaseCleanup) {
		const cleanup = activePhaseCleanup;
		activePhaseCleanup = null;
		cleanup.consumed = true;
		await cleanup.teardown();
	}

	await go(phase);
};

// ---------------------------------------------------------------------------
// Screen factory
// ---------------------------------------------------------------------------

const screen = createScreen<BGPhase, BGEvents>({
	name: "battleground",

	events: () => {

		return {
			events: BattlegroundEvent,
			listeners: [
				BattlegroundEvent.phaseFinished.listen(transitionToCurrentPhase),
				BattlegroundEvent.phaseFinished.listen(updateHudFromSessionChanges),

				BattlegroundEvent.newRunRequested.listen(() => {
					env.resetState();
					void getScreenManager().go("crystals");
				}),

				BattlegroundEvent.mainMenuRequested.listen(() => {
					env.resetState();
					void getScreenManager().go("title");
				}),

				// --- HUD listeners (wins/lives/round display updates) ---
				...UI.registerListeners(),

			],
		};
	},

	create: async (_ctx) => {

		Components.create();
		previousSessionHudSnapshot = createSessionHudSnapshot();

		AudioManager.playMusic("music_battlemap_vetruv");

		// TODO: input enable/disable should be managed at the screen level, not
		// delegated to individual components (Board, Shop, etc.).
		Board.setIsInputEnabled(true);

		// Kick off the phase loop
		await transitionToCurrentPhase({});
	},

	phases: {
		encounter: Encounter.encounterPhase(true),
		pre_combat: Encounter.encounterPhase(false),
		shop: ctx => Phases.ShopPhase(ctx),
		orb_shop: openOrbShop,
		upgrade_core: Phases.UpgradeCorePhase,
		add_reaction_core: Phases.AddReactionCorePhase,

		combat: runPhaseHandler(Phases.CombatPhase),
		game_over: runPhaseHandler(Phases.GameOverPhase),
		victory: runPhaseHandler(Phases.VictoryPhase),
	},
});

const _bgscreen = screenModule(screen, {
	onDestroy: () => {
		previousSessionHudSnapshot = null;
		Chara.clearAll();
	},
});
export const { init, create, destroy, go, name } = _bgscreen;
