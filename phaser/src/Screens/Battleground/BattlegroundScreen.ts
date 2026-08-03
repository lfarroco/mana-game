import * as Chara from "@Systems/Chara/Chara";
import * as Models from "@game/Models";
import * as AudioManager from "@Systems/AudioManager";
import * as Encounter from "./Phases/Encounter/Encounter";

import * as Components from "./Components";
import * as Phases from "./Phases";
import { env } from "@Env";
import { BattlegroundEvent } from "../../Events";
import { getScreenManager } from "../ScreenManager";
import * as UI from "./Components/UI/UI";
import { createScreen, ScreenCtx, screenModule } from "@mana/framework";
import { combatListeners } from "./Phases/Combat/handleCombatPhase";

export type BGPhase = Models.PhaseType;

type BGEvents = typeof BattlegroundEvent

export type BGContext = ScreenCtx<BGPhase, BGEvents>

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


const transitionToCurrentPhase = async () => {
	const phase = env.state.session.phase;
	await go(phase);
};

const screen = createScreen<BGPhase, BGEvents>({
	name: "battleground",

	events: () => {

		const evs = BattlegroundEvent;

		return {
			events: evs,
			listeners: [
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
				...combatListeners,
			],
		};
	},

	create: async (_ctx) => {

		const cloudsBg = Components.Background.create();
		const namesDisplay = Components.NamesDisplay.create();
		const board = Components.Board.create();
		const resultsUI = Components.ResultsUI.create(); // remove this, should be created by phase itself
		const discardZone = Components.DiscardZone.create();
		const UI = Components.UI.create();

		AudioManager.playMusic("music_battlemap_vetruv");

		transitionToCurrentPhase();

		return [
			cloudsBg,
			...namesDisplay,
			...board,
			...resultsUI,
			discardZone,
			UI
		]
	},

	phases: {
		encounter: Encounter.encounterPhase(true),
		pre_combat: Encounter.encounterPhase(false),
		shop: ctx => Phases.ShopPhase(ctx),
		orb_shop: Phases.openOrbShop,
		upgrade_core: Phases.UpgradeCorePhase,
		add_reaction_core: Phases.AddReactionCorePhase,

		combat: Phases.CombatPhase,
		game_over: Phases.GameOverPhase,
		victory: Phases.VictoryPhase,
	},
});

const _bgscreen = screenModule(screen, {
	onDestroy: () => {
		Chara.clearAll();
	},
});
export const { init, create, destroy, go, name } = _bgscreen;
