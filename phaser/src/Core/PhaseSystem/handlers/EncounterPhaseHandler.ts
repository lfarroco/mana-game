import { createPhaseHandler } from "@Core/PhaseSystem/BasePhaseHandler";
import { PhaseTransitionContext, PhaseTransitionResult, ActionType } from "@Core/PhaseSystem/types";
import * as GameLogic from "@Core/GameLogic";
import { PhaseType } from "@Core/Types";

export const encounterPhaseHandler = createPhaseHandler({
	phase: "encounter" as PhaseType,
	actionType: ActionType.PHASE_TRANSITION,
	computeTransition: (context: PhaseTransitionContext): PhaseTransitionResult => {
		const { session, actionId } = context;

		// Handle combat warning
		if (actionId === "combat_encounter") {
			return {
				nextPhase: "combat",
				nextOptions: [],
				specialData: {
					startCombat: true,
				},
			};
		}

		// Handle special encounters -> Orb Shop
		const specialOrbEncounters = ["upgrade_unit", "power_distributor", "power_absorber"];
		if (specialOrbEncounters.includes(actionId)) {
			let nextOptions: any[] = [];
			if (actionId === "upgrade_unit") nextOptions = [{ id: "upgrade_orb" }];
			if (actionId === "power_distributor") nextOptions = [{ id: "distribute_power_orb" }];
			if (actionId === "power_absorber") nextOptions = [{ id: "absorb_power_orb" }];

			return {
				nextPhase: "orb_shop",
				nextOptions,
				stepIncrement: 0,
			};
		}

		// Handle skip encounter -> Shop
		if (actionId === "skip_encounter") {
			const shopResult = GameLogic.generateShopOptions(session);
			return {
				nextPhase: "shop",
				nextOptions: shopResult.options,
				stepIncrement: 0,
			};
		}

		// Default: Selected an encounter -> Shop
		const shopResult = GameLogic.generateShopOptions(session, actionId);
		return {
			nextPhase: "shop",
			nextOptions: shopResult.options,
			stepIncrement: 0,
		};
	},
});
