import { BasePhaseHandler } from "../BasePhaseHandler";
import { PhaseTransitionContext, PhaseTransitionResult, ActionType } from "../types";
import { GameLogic } from "../../GameLogic";
import { PhaseType } from "../../Types";

export class AddReactionCorePhaseHandler extends BasePhaseHandler {
	readonly phase: PhaseType = 'add_reaction_core';
	readonly actionType = ActionType.PHASE_TRANSITION;

	protected computeTransition(context: PhaseTransitionContext): PhaseTransitionResult {
		const { session, } = context;

		// Same logic as UpgradeCore: any valid action transitions to next round
		const nextRound = session.round + 1;
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
