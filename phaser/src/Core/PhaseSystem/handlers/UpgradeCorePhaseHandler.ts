import { createPhaseHandler } from "../BasePhaseHandler";
import { PhaseTransitionContext, PhaseTransitionResult, ActionType } from "../types";
import * as GameLogic from "../../GameLogic";
import { PhaseType } from "../../Types";

export const upgradeCorePhaseHandler = createPhaseHandler({
	phase: 'upgrade_core' as PhaseType,
	actionType: ActionType.PHASE_TRANSITION,
	computeTransition: (context: PhaseTransitionContext): PhaseTransitionResult => {
		const { session, actionId } = context;

		// Handle specific upgrade selections (sub-phase actions that don't transition)
		const upgradeActions = ['increase_core_max_life', 'upgrade_core_power', 'decrease_core_cooldown'];
		if (upgradeActions.includes(actionId)) {
			// Stay in the same phase, keep the same options
			return {
				nextPhase: 'upgrade_core',
				nextOptions: session.current_options
					? (Array.isArray(session.current_options) ? session.current_options : session.current_options.options)
					: [],
				stepIncrement: 0,
			};
		}

		// Handle upgrade_core_done (final transition to next phase)
		if (actionId === 'upgrade_core_done') {
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
		}

		throw new Error(`Unexpected action ${actionId} in UpgradeCore handler`);
	},
});
