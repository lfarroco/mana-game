import { BasePhaseHandler } from "../BasePhaseHandler";
import { PhaseTransitionContext, PhaseTransitionResult, ActionType } from "../types";
import { GameLogic } from "../../GameLogic";
import { PhaseType } from "../../Types";

export class UpgradeCorePhaseHandler extends BasePhaseHandler {
	readonly phase: PhaseType = 'upgrade_core';
	readonly actionType = ActionType.PHASE_TRANSITION;

	protected computeTransition(context: PhaseTransitionContext): PhaseTransitionResult {
		const { session, } = context;

		// Any valid action in this phase triggers transition to next round
		// (Actual upgrade application happens in GameLogic resolution or beforehand)

		const nextRound = session.round + 1;
		// Reset step to 1
		const stepIncrement = 1 - session.step;
		const roundIncrement = 1;

		const tempSession = { ...session, round: nextRound, step: 1 };
		const encounterResult = GameLogic.generateEncounterOptions(tempSession);

		return {
			nextPhase: 'encounter',
			nextOptions: encounterResult.options,
			stepIncrement,
			roundIncrement
		};
	}
}
