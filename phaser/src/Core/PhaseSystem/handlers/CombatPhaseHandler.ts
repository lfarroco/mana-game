import { BasePhaseHandler } from "../BasePhaseHandler";
import { PhaseTransitionContext, PhaseTransitionResult, ActionType } from "../types";
import { GameLogic } from "../../GameLogic";
import { PhaseType } from "../../Types";
import { getPhaseForTurn } from "../PhaseConfig";

export class CombatPhaseHandler extends BasePhaseHandler {
	readonly phase: PhaseType = 'combat';
	readonly actionType = ActionType.PHASE_TRANSITION;

	protected computeTransition(context: PhaseTransitionContext): PhaseTransitionResult {
		const { session, actionId } = context;

		if (actionId !== 'combat_done') {
			// Should be validated by validator, but safe check
			throw new Error(`Unexpected action ${actionId} in Combat handler`);
		}

		// Check for victory/game_over conditions
		// Note: session.wins and losses are updated during current turn processing (in simulateCombat) 
		// BEFORE we get here? 
		// In GameLogic.transitionToNextState:
		// It creates nextSession copy.
		// If phase becomes combat, it runs simulation and updates wins/losses on nextSession.
		// Returns nextSession.
		// User sees result.
		// User clicks 'combat_done'.
		// transitionToNextState called again. session has updated wins/losses.

		if (session.wins >= 10) {
			return {
				nextPhase: 'victory',
				nextOptions: [{ id: 'return_to_menu', label: 'Return to Menu' }]
			};
		}

		if (session.losses >= 4) {
			return {
				nextPhase: 'game_over',
				nextOptions: [{ id: 'return_to_menu', label: 'Return to Menu' }]
			};
		}

		// Continue progression
		const nextStep = session.step + 1;
		let nextRound = session.round;
		let stepIncrement = 1;
		let roundIncrement = 0;

		const expectedPhase = getPhaseForTurn(nextRound, nextStep);

		let nextPhase: PhaseType;
		let nextOptions: any[] = [];

		if (expectedPhase === 'upgrade_core' || expectedPhase === 'add_reaction_core') {
			nextPhase = expectedPhase;
			if (nextPhase === 'upgrade_core') {
				nextOptions = [
					{ id: 'increase_core_max_life' },
					{ id: 'upgrade_core_power' },
					{ id: 'decrease_core_cooldown' }
				];
			} else {
				nextOptions = [
					{ id: 'on_100_damage_effect' },
					{ id: 'on_crit_effect' },
					{ id: 'on_battle_start_effect' }
				];
			}
		} else {
			// No upgrade phase, start next round
			// GameLogic: "No upgrade phase, start next round. nextSession.step = 1"
			// So effectively we jump to round + 1, step 1.
			nextRound += 1;
			nextPhase = 'encounter';
			// Step reset handled by returning explicit increments?
			// Result interface has stepIncrement, roundIncrement.
			// If we handle specific logic like "reset step to 1", maybe we need absolute values in result?
			// The interface says `stepIncrement`.
			// If we want step=1, and current is X. stepIncrement = 1 - X.
			// But BasePhaseHandler or Manager applies increments.
			// Maybe we need a `resetStep` flag or strictly follow increments?
			// Or we can return `specialData` with `forceStep: 1`.

			// Let's modify PhaseTransitionResult in types.ts to support absolute setting or we calculate relative.
			// session.step is current step.
			// nextStep should be 1.
			// increment = 1 - session.step.

			stepIncrement = 1 - session.step;
			roundIncrement = 1;

			// We need to generate options for the new round/encounter
			// Need session with updated round/step for generation?
			// GameLogic.generateEncounterOptions uses session.round/step.
			// We should mock/clone logic step here.

			const tempSession = { ...session, round: nextRound, step: 1 };
			const encounterResult = GameLogic.generateEncounterOptions(tempSession);
			nextOptions = encounterResult.options;
		}

		return {
			nextPhase,
			nextOptions,
			stepIncrement,
			roundIncrement
		};
	}
}
