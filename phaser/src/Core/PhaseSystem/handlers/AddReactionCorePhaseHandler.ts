import { createPhaseHandler } from "@Core/PhaseSystem/BasePhaseHandler";
import { PhaseTransitionContext, PhaseTransitionResult, ActionType } from "@Core/PhaseSystem/types";
import * as GameLogic from "@Core/GameLogic";
import { PhaseType } from "@Core/Types";

export const addReactionCorePhaseHandler = createPhaseHandler({
	phase: "add_reaction_core" as PhaseType,
	actionType: ActionType.PHASE_TRANSITION,
	computeTransition: (context: PhaseTransitionContext): PhaseTransitionResult => {
		const { session, actionId } = context;

		// Handle specific reaction card selections (sub-phase actions that don't transition)
		const reactionActions = [
			"on_100_damage_effect",
			"on_ally_death_effect",
			"on_crit_effect",
			"on_battle_start_effect",
		];
		if (reactionActions.includes(actionId)) {
			// Stay in the same phase, keep the same options
			return {
				nextPhase: "add_reaction_core",
				nextOptions: session.current_options
					? Array.isArray(session.current_options)
						? session.current_options
						: session.current_options.options
					: [],
				stepIncrement: 0,
			};
		}

		// Handle add_reaction_core_done (final transition to next phase)
		if (actionId === "add_reaction_core_done") {
			const nextRound = session.round + 1;
			const stepIncrement = 1 - session.step;
			const roundIncrement = 1;

			const tempSession = { ...session, round: nextRound, step: 1 };
			const encounterResult = GameLogic.generateEncounterOptions(tempSession);

			return {
				nextPhase: "encounter",
				nextOptions: encounterResult.options,
				stepIncrement,
				roundIncrement,
			};
		}

		throw new Error(`Unexpected action ${actionId} in AddReactionCore handler`);
	},
});
