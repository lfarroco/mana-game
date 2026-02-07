import { createPhaseHandler } from "../BasePhaseHandler";
import { PhaseTransitionContext, PhaseTransitionResult, ActionType } from "../types";
import { GameLogic } from "../../GameLogic";
import { PhaseType } from "../../Types";
import { getPhaseForTurn } from "../PhaseConfig";

export const orbShopPhaseHandler = createPhaseHandler({
	phase: 'orb_shop' as PhaseType,
	actionType: ActionType.PHASE_TRANSITION,
	computeTransition: (context: PhaseTransitionContext): PhaseTransitionResult => {
		const { session, actionId } = context;

		if (actionId === 'apply_orb') {
			return {
				nextPhase: 'orb_shop',
				nextOptions: session.current_options
					? (Array.isArray(session.current_options) ? session.current_options : session.current_options.options)
					: [],
				stepIncrement: 0,
			};
		}

		if (actionId === 'orb_shop_done') {
			const expectedPhase = getPhaseForTurn(session.round, session.step);

			let nextPhase: PhaseType = 'encounter';
			let nextOptions: any[] = [];

			if (expectedPhase === 'encounter') {
				nextPhase = 'encounter';
				const encounterResult = GameLogic.generateEncounterOptions(session);
				nextOptions = encounterResult.options;
			} else if (expectedPhase === 'combat') {
				nextPhase = 'encounter';
				nextOptions = [{ id: 'combat_encounter' }];
			} else {
				nextPhase = 'encounter';
				const encounterResult = GameLogic.generateEncounterOptions(session);
				nextOptions = encounterResult.options;
			}

			return {
				nextPhase,
				nextOptions,
				stepIncrement: 0,
			};
		}

		throw new Error(`Unexpected action ${actionId} in OrbShop handler`);
	},
});
