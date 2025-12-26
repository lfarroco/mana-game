import { applyDamageToForce, getUnitForce, manipulateCoreLife } from "@Models/Entities/Force";
import { Unit, calculateCritical } from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Scenes//Battleground/Systems/CombatStatsTracker";
import * as CombatSystemStates from "@Scenes/Battleground/Systems/CombatSystemStates";

import { getEnemyCore } from "@Models/Entities/Card";
import { State } from "@Models/State";
import { processReactions } from "../TriggerSystem";
import * as CombatEffectsRegistry from "@Scenes/Battleground/CombatEffectsRegistry";

export function dealDamageLogicIO(state: State, sourceUnit: Unit, scale: number = 1) {
	const damageAmount = sourceUnit.power;

	const targetForce = state.battleData.forces.find(
		(force: { id: string }) => force.id !== sourceUnit.force
	)!;

	const enemyCore = getEnemyCore(state)(sourceUnit.force);

	const effect = () => {
		const crit = calculateCritical(sourceUnit);
		const damage = ((damageAmount + crit.bonusPower) * crit.multiplier) * scale;

		const actualLifeChanged = applyDamageToForce(state, targetForce, damage, 0, "normal", crit.isCritical);
		const combatStates = CombatSystemStates.getCombatSystemStates();
		CombatStatsTracker.trackDamage(combatStates.combatStatsTrackerState, state, sourceUnit.id, actualLifeChanged);

		if (crit.isCritical) {
			processReactions(state, sourceUnit, { id: "on_crit" });
		}

		if (sourceUnit.lifesteal) {
			manipulateCoreLife(state, getUnitForce(state, sourceUnit.force), damage);
		}

		if (enemyCore.reflect) {
			const reflected = (damage * enemyCore.reflect) / 100;

			if (reflected > 0) {
				const actualLifeChanged = applyDamageToForce(state, targetForce, reflected);
				const combatStates = CombatSystemStates.getCombatSystemStates();
				CombatStatsTracker.trackDamage(combatStates.combatStatsTrackerState, state, enemyCore.id, actualLifeChanged);
			}
		}
	};

	const effects = CombatEffectsRegistry.getCombatEffects();
	if (effects.onDamage) {
		effects.onDamage(sourceUnit.id, enemyCore!.id, effect);
	} else {
		effect();
	}
}
