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

		combat: Phases.CombatPhase,
		game_over: Phases.GameOverPhase,
		victory: Phases.VictoryPhase,
	},
});

const _bgscreen = screenModule(screen, {
	onDestroy: () => {
		previousSessionHudSnapshot = null;
		Chara.clearAll();
	},
});
export const { init, create, destroy, go, name } = _bgscreen;
