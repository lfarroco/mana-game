import { createPhaseHandler } from "@Core/PhaseSystem/BasePhaseHandler";
import { PhaseTransitionContext, PhaseTransitionResult, ActionType } from "@Core/PhaseSystem/types";
import { PhaseOption } from "@Core/Types";
import * as GameLogic from "@Core/GameLogic";
import { PhaseType } from "@Core/Types";
import { getPhaseForTurn } from "@Core/PhaseSystem/PhaseConfig";

export const combatPhaseHandler = createPhaseHandler({
	phase: "combat" as PhaseType,
	actionType: ActionType.PHASE_TRANSITION,
	computeTransition: (context: PhaseTransitionContext): PhaseTransitionResult => {
		const { session, actionId } = context;

		if (actionId !== "combat_done" && actionId !== "victory") {
			throw new Error(`Unexpected action ${actionId} in Combat handler`);
		}

		// 'victory' is accepted but treated as a regular continuation (endless mode);
		// only 'combat_done' with wins >= 10 routes to the victory screen.
		if (actionId === "combat_done" && session.wins >= 10) {
			return {
				nextPhase: "victory",
				nextOptions: [
					{ id: "victory", label: "Continue Endless" },
					{ id: "return_to_menu", label: "Return to Menu" },
				],
			};
		}

		if (session.losses >= 4) {
			return {
				nextPhase: "game_over",
				nextOptions: [{ id: "return_to_menu", label: "Return to Menu" }],
			};
		}

		const nextStep = session.step + 1;
		let nextRound = session.round;
		let stepIncrement = 1;
		let roundIncrement = 0;

		const expectedPhase = getPhaseForTurn(nextRound, nextStep);

		let nextPhase: PhaseType;
		let nextOptions: PhaseOption[] = [];

		if (expectedPhase === "upgrade_core" || expectedPhase === "add_reaction_core") {
			nextPhase = expectedPhase;
			if (nextPhase === "upgrade_core") {
				nextOptions = [
					{ id: "increase_core_max_life" },
					{ id: "upgrade_core_power" },
					{ id: "decrease_core_cooldown" },
				];
			} else {
				nextOptions = [
					{ id: "on_100_damage_effect" },
					{ id: "on_crit_effect" },
					{ id: "on_battle_start_effect" },
				];
			}
		} else {
			nextRound += 1;
			nextPhase = "encounter";
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
