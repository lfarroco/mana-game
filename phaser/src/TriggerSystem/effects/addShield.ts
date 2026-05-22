import { getAlliedCore } from "@Models/Entities/Card";
import { manipulateCoreShield } from "@Models/Entities/Force";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import { CombatEnvironment } from "Client/Scenes/Battleground/CombatEnvironment";

export const addShieldLogicIO = async (
	env: CombatEnvironment,
	sourceUnit: Unit,
	scale: number = 1,
	delayedExecution?: number
) => {
	const baseAmount = sourceUnit.power;
	const sourceForce = env.state.battleData.forces.find((force) => force.id === sourceUnit.force)!;
	const alliedCore = getAlliedCore(env.state)(sourceUnit.force);

	const effect = async () => {
		const crit = calculateCritical(sourceUnit);

		const shieldAmount = ((baseAmount + crit.bonusPower) * crit.multiplier) * scale;

		const actualShieldChange = manipulateCoreShield(env.state, sourceForce, shieldAmount, crit.isCritical, true, env.effects, env.combatStates.forceStatsState);

		if (actualShieldChange > 0) {
			const { combatStates } = env;
			CombatStatsTracker.trackShield(combatStates.combatStatsTrackerState, env, sourceUnit.id, actualShieldChange);
		}

		if (crit.isCritical) {
			env.processReactions(env, sourceUnit, { id: "on_crit" }, 1);
		}
	};

	const effects = env.effects;
	if (effects.onShield) {
		const crit = calculateCritical(sourceUnit);
		const shieldAmount = ((baseAmount + crit.bonusPower) * crit.multiplier) * scale;
		effects.onShield(sourceUnit.id, alliedCore.id, shieldAmount, effect, delayedExecution);
	} else {
		effect();
	}
};
