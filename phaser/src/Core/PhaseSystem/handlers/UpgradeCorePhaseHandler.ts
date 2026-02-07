import { createPhaseHandler } from "../BasePhaseHandler";
import { PhaseTransitionContext, PhaseTransitionResult, ActionType } from "../types";
import { GameLogic } from "../../GameLogic";
import { PhaseType } from "../../Types";

export const upgradeCorePhaseHandler = createPhaseHandler({
	phase: 'upgrade_core' as PhaseType,
	actionType: ActionType.PHASE_TRANSITION,
	computeTransition: (context: PhaseTransitionContext): PhaseTransitionResult => {
		const { session } = context;
		const nextRound = session.round + 1;
		const stepIncrement = 1 - session.step;
		const roundIncrement = 1;

		const tempSession = { ...session, round: nextRound, step: 1 };
		const encounterResult = GameLogic.generateEncounterOptions(tempSession);

		return {
			nextPhase: 'encounter',
			nextOptions: encounterResult.options,
			stepIncrement,
			roundIncrement,
		};
	},
});
