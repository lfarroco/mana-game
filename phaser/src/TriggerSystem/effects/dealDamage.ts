import { applyDamageToForce, getUnitForce, manipulateCoreLife } from "@Models/Entities/Force";
import { Unit, calculateCritical } from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import { getEnemyCore } from "@Models/Entities/Card";
import { CombatEnvironment } from "Client/Scenes/Battleground/CombatEnvironment";

export function dealDamageLogicIO(env: CombatEnvironment, sourceUnit: Unit, scale: number = 1, delayedExecution?: number) {
	const damageAmount = sourceUnit.power;

	const targetForce = env.state.battleData.forces.find(
		(force: { id: string }) => force.id !== sourceUnit.force
	)!;

	const enemyCore = getEnemyCore(env.state)(sourceUnit.force);

	const effect = () => {
		const crit = calculateCritical(sourceUnit);
		const damage = ((damageAmount + crit.bonusPower) * crit.multiplier) * scale;

		const actualLifeChanged = applyDamageToForce(
			env.state,
			targetForce,
			damage,
			0,
			"normal",
			crit.isCritical,
			env.effects,
			env.combatStates.forceStatsState
		);

		const { combatStates } = env;
		CombatStatsTracker.trackDamage(combatStates.combatStatsTrackerState, env, sourceUnit.id, actualLifeChanged);

		if (crit.isCritical) {
			env.processReactions(env, sourceUnit, { id: "on_crit" }, 1);
		}

		if (sourceUnit.lifesteal) {
			manipulateCoreLife(
				env.state,
				getUnitForce(env.state, sourceUnit.force),
				damage,
				false,
				env.effects,
				env.combatStates.forceStatsState
			);
		}

		if (enemyCore.reflect) {
			const reflected = (damage * enemyCore.reflect) / 100;

			if (reflected > 0) {
				const actualLifeChanged = applyDamageToForce(
					env.state,
					targetForce,
					reflected,
					0,
					"normal",
					false,
					env.effects,
					env.combatStates.forceStatsState
				);

				const { combatStates } = env;
				CombatStatsTracker.trackDamage(combatStates.combatStatsTrackerState, env, enemyCore.id, actualLifeChanged);
			}
		}
	};

	const effects = env.effects;
	if (effects.onDamage) {
		const crit = calculateCritical(sourceUnit);
		const damage = ((damageAmount + crit.bonusPower) * crit.multiplier) * scale;
		effects.onDamage(sourceUnit.id, enemyCore!.id, damage, effect, delayedExecution);
	} else {
		effect();
	}
}
