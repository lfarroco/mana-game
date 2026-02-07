import { createPhaseHandler } from "../BasePhaseHandler";
import { PhaseTransitionContext, PhaseTransitionResult, ActionType } from "../types";
import { GameLogic } from "../../GameLogic";
import { PhaseType } from "../../Types";
import { getPhaseForTurn } from "../PhaseConfig";

export const combatPhaseHandler = createPhaseHandler({
	phase: 'combat' as PhaseType,
	actionType: ActionType.PHASE_TRANSITION,
	computeTransition: (context: PhaseTransitionContext): PhaseTransitionResult => {
		const { session, actionId } = context;

		if (actionId !== 'combat_done') {
			throw new Error(`Unexpected action ${actionId} in Combat handler`);
		}

		if (session.wins >= 10) {
			return {
				nextPhase: 'victory',
				nextOptions: [{ id: 'return_to_menu', label: 'Return to Menu' }],
			};
		}

		if (session.losses >= 4) {
			return {
				nextPhase: 'game_over',
				nextOptions: [{ id: 'return_to_menu', label: 'Return to Menu' }],
			};
		}

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
					{ id: 'decrease_core_cooldown' },
				];
			} else {
				nextOptions = [
					{ id: 'on_100_damage_effect' },
					{ id: 'on_crit_effect' },
					{ id: 'on_battle_start_effect' },
				];
			}
		} else {
			nextRound += 1;
			nextPhase = 'encounter';
			stepIncrement = 1 - session.step;
			roundIncrement = 1;

			const tempSession = { ...session, round: nextRound, step: 1 };
			const encounterResult = GameLogic.generateEncounterOptions(tempSession);
			nextOptions = encounterResult.options;
		}

		return {
			nextPhase,
			nextOptions,
			stepIncrement,
			roundIncrement,
		};
	},
});
