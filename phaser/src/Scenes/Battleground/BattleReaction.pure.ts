// Pure battle reaction logic, with dependency injection for side effects
import { Unit } from "../../Models/Entities/Unit";
import { State, getActiveUnits } from "../../Models/State";

export interface BattleReactionDeps {
	getActionIdsFromTrait: (trait: any) => string[];
	shouldTriggerBattleReaction: (
		battleReactionTrait: any,
		actionUnit: Unit,
		actionId: string,
		reactorUnit: Unit
	) => boolean;
	triggerBattleReaction: (
		reactorUnit: Unit,
		battleReactionTrait: any,
		actionUnit: Unit,
		actionId: string
	) => Promise<void>;
	getActiveUnits?: (state: State) => Unit[];
}

/**
 * Pure function to process battle reactions for all units when a unit acts.
 * All side effects are injected via deps.
 */
export async function processBattleReactionsPure(
	actionUnit: Unit,
	state: State,
	deps: BattleReactionDeps
): Promise<void> {
	const getUnits = deps.getActiveUnits || getActiveUnits;
	const allUnits = getUnits(state);
	const actingUnitTraits = actionUnit.traits || [];

	for (const actingTrait of actingUnitTraits) {
		const actionIds = deps.getActionIdsFromTrait(actingTrait);
		for (const actionId of actionIds) {
			for (const reactorUnit of allUnits) {
				if (reactorUnit.id === actionUnit.id) continue;
				for (const reactorTrait of reactorUnit.traits || []) {
					if (reactorTrait.id === "battle_reaction") {
						if (deps.shouldTriggerBattleReaction(reactorTrait, actionUnit, actionId, reactorUnit)) {
							await deps.triggerBattleReaction(reactorUnit, reactorTrait, actionUnit, actionId);
						}
					}
				}
			}
		}
	}
}
