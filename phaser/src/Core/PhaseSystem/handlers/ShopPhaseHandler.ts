import { BasePhaseHandler } from "../BasePhaseHandler";
import { PhaseTransitionContext, PhaseTransitionResult, ActionType } from "../types";
import { GameLogic } from "../../GameLogic";
import { PhaseOption, PhaseType } from "../../Types";
import { getPhaseForTurn } from "../PhaseConfig";

export class ShopPhaseHandler extends BasePhaseHandler {
	readonly phase: PhaseType = 'shop';
	readonly actionType = ActionType.PHASE_TRANSITION;

	protected computeTransition(context: PhaseTransitionContext): PhaseTransitionResult {
		const { session } = context;

		// Check if it's a purchase (card ID) or skip
		// We assume validation has passed, so action is valid.

		const expectedPhase = getPhaseForTurn(session.round, session.step);

		let nextPhase: PhaseType = 'encounter';
		let nextOptions: PhaseOption[] = [];

		if (expectedPhase === 'encounter') {
			nextPhase = 'encounter';
			const encounterResult = GameLogic.generateEncounterOptions(session);
			nextOptions = encounterResult.options;
		} else if (expectedPhase === 'combat') {
			// Show combat_encounter warning
			nextPhase = 'encounter'; // Yes, it goes to 'encounter' phase but with 'combat_encounter' option
			nextOptions = [{ id: 'combat_encounter' }];
		} else {
			// Should not happen based on hardcoded arrays + logic, but for safety
			// maybe it's time for upgrade?
			// But logic for shop->upgrade isn't explicit in GameLogic loop for Shop.
			// It assumes Shop only leads to Encounter or Combat warning.
			nextPhase = 'encounter';
			const encounterResult = GameLogic.generateEncounterOptions(session);
			nextOptions = encounterResult.options;
		}

		return {
			nextPhase,
			nextOptions
			// No step increment leaving shop
		};
	}
}
