import * as Chara from "@Components/Chara/Chara";
import * as Models from "@game/Models";
import * as AudioManager from "@Systems/AudioManager";
import * as Encounter from "./Phases/Encounter/Encounter";

import * as Components from "./Components";
import * as Phases from "./Phases";
import * as PhaseTransitions from "./phaseTransitions";
import { env } from "@Env";
import { BattlegroundEvent, GameEvent } from "../../Events";
import { getScreenManager } from "../ScreenManager";
import * as UI from "./Components/UI/UI";
import { syncPlayerBoardUnits } from "./playerBoardSync";
import { createScreen, ScreenCtx, screenModule } from "@mana/framework";

export type BGPhase = Models.PhaseType | "combat_victory" | "combat_defeat";

type BGEvents = typeof BattlegroundEvent;

export type BGContext = ScreenCtx<BGPhase, BGEvents>;

/**
 * Dispatch an action, update state, optionally run a callback, then emit phaseFinished.
 * This is the canonical single-step phase transition used by all phase handlers.
 *
 * The outgoing phase's exit animation starts immediately, in parallel with the
 * server dispatch — so the 150-200ms request round-trip (multiplayer) is hidden
 * behind the slide-out instead of showing as a dead pause. The next go() skips
 * the exit since it already ran here.
 *
 * @param action - The game action to dispatch through the server adapter.
 * @param onBeforeFinish - Optional callback that fires after state update but before
 *   phaseFinished is emitted. Use for intermediate events (HUD deltas, purchase events, etc.).
 */
export const dispatchAction = async (
	action: Models.Action,
	onBeforeFinish?: (response: Models.ActionResponse) => void | Promise<void>
): Promise<void> => {
	if (transitionInFlight) return;

	const previousPhase = env.state.session.phase;
	const exitDone = beginPhaseTransition();

	try {
		let response: Models.ActionResponse;
		try {
			response = await env.dispatch(action);
		} catch (err) {
			// The action failed — bring the outgoing phase back into view
			// instead of leaving the board empty.
			await restorePhaseExit().catch(() => {});
			throw err;
		}

		await exitDone;

		env.updateState({ ...env.state, ...response });
		if (onBeforeFinish) await onBeforeFinish(response);
		await BattlegroundEvent.phaseFinished.emit({ previousPhase });
	} finally {
		endPhaseTransition();
	}
};

/**
 * True while a phase transition (including the pre-exit animation) is in
 * flight. Guards against re-entrant dispatches from double-clicks during the
 * longer interaction window the exit animation creates.
 */
let transitionInFlight = false;

/**
 * Lock input and start the current phase's exit animation. The returned
 * promise resolves when the exit finishes. Run this in parallel with a server
 * dispatch so the outgoing UI slides away while the request is in flight.
 */
export const beginPhaseTransition = (): Promise<void> => {
	transitionInFlight = true;
	return startPhaseExit();
};

/** Release the transition lock after the phase switch completes. */
export const endPhaseTransition = (): void => {
	transitionInFlight = false;
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
	onBeforeFinish?: () => void | Promise<void>
): Promise<void> => {
	if (onBeforeFinish) await onBeforeFinish();
	await BattlegroundEvent.phaseFinished.emit({ previousPhase });
};

const transitionToCurrentPhase = async () => {
	const { phase } = env.state.session;

	// Always reconcile the board to the session team before moving to the next phase.
	await syncPlayerBoardUnits();

	// Keep the HUD hearts in sync — encounters that spend or restore life
	// (soul_trade, rest_inn, roulette_wheel) mutate losses directly.
	UI.syncLivesDisplay();

	// Keep the HUD round counter in sync — the round advances on phase
	// transitions (e.g. after the upgrade_core → next-round handoff), which
	// is outside the combat-results continue flow.
	UI.syncRoundDisplay();

	await go(phase);
};

const screen = createScreen<BGPhase, BGEvents>({
	name: "battleground",

	events: () => {
		const evs = BattlegroundEvent;

		return {
			events: evs,
			listeners: [
				GameEvent.screenHidden.listen(Chara.clearAll),

				evs.phaseFinished.listen(transitionToCurrentPhase),

				evs.newRunRequested.listen(() => {
					env.resetState();
					void getScreenManager().go("crystals");
				}),

				evs.mainMenuRequested.listen(() => {
					env.resetState();
					void getScreenManager().go("title");
				}),

				...UI.registerListeners(),
			],
		};
	},

	create: async (_ctx) => {
		const cloudsBg = Components.Background.create();
		const namesDisplay = Components.NamesDisplay.create();
		const board = Components.Board.create();
		const discardZone = Components.DiscardZone.create();
		const UI = Components.UI.create();

		AudioManager.playMusic("music_battlemap_vetruv");

		await transitionToCurrentPhase();

		return [cloudsBg, ...namesDisplay, ...board, discardZone, UI];
	},

	phases: {
		encounter: {
			handler: Encounter.encounterPhase(true),
			transition: PhaseTransitions.slideTransition,
		},
		pre_combat: {
			handler: Encounter.encounterPhase(false),
			transition: PhaseTransitions.slideTransition,
		},
		shop: {
			handler: (ctx) => Phases.ShopPhase(ctx),
			transition: PhaseTransitions.slideTransition,
		},
		orb_shop: {
			handler: Phases.openOrbShop,
			transition: PhaseTransitions.slideTransition,
		},
		upgrade_core: {
			handler: Phases.UpgradeCorePhase,
			transition: PhaseTransitions.slideTransition,
		},
		add_reaction_core: {
			handler: Phases.AddReactionCorePhase,
			transition: PhaseTransitions.slideTransition,
		},
		awaken: {
			handler: Phases.AwakenPhase,
			transition: PhaseTransitions.slideTransition,
		},
		combat: {
			handler: (ctx) => Phases.CombatPhase(ctx),
			transition: PhaseTransitions.slideTransition,
		},
		game_over: {
			handler: Phases.GameOverPhase,
			transition: PhaseTransitions.slideTransition,
		},
		victory: {
			handler: (ctx) => Phases.VictoryPhase(ctx),
			transition: PhaseTransitions.slideTransition,
		},

		// Client-only phases (not present in session)
		combat_victory: {
			handler: (ctx) => Phases.CombatVictoryPhase(ctx),
			transition: PhaseTransitions.slideTransition,
		},
		combat_defeat: {
			handler: (ctx) => Phases.CombatDefeatPhase(ctx),
			transition: PhaseTransitions.slideTransition,
		},
	},
});

const _bgscreen = screenModule(screen);
export const { init, create, destroy, go, name, currentPhase, startPhaseExit, restorePhaseExit } =
	_bgscreen;
