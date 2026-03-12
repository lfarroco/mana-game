import { createPhaseHandler } from "@Core/PhaseSystem/BasePhaseHandler";
import { PhaseTransitionContext, PhaseTransitionResult, ActionType } from "@Core/PhaseSystem/types";
import * as GameLogic from "@Core/GameLogic";
import { PhaseOption, PhaseType } from "@Core/Types";
import { getPhaseForTurn } from "@Core/PhaseSystem/PhaseConfig";

export const shopPhaseHandler = createPhaseHandler({
	phase: "shop" as PhaseType,
	actionType: ActionType.PHASE_TRANSITION,
	computeTransition: (context: PhaseTransitionContext): PhaseTransitionResult => {
		const { session } = context;
		const expectedPhase = getPhaseForTurn(session.round, session.step + 1);

		let nextPhase: PhaseType = "encounter";
		let nextOptions: PhaseOption[] = [];

		if (expectedPhase === "encounter") {
			nextPhase = "encounter";
			const encounterResult = GameLogic.generateEncounterOptions(session);
			nextOptions = encounterResult.options;
		} else if (expectedPhase === "combat") {
			nextPhase = "encounter";
			nextOptions = [{ id: "combat_encounter" }];
		} else {
			nextPhase = "encounter";
			const encounterResult = GameLogic.generateEncounterOptions(session);
			nextOptions = encounterResult.options;
		}

		return {
			nextPhase,
			nextOptions,
			stepIncrement: 1,
		};
	},
});
