import { applyDamageToForce, getUnitForce, manipulateCoreLife } from "@Models/Entities/Force";
import { Unit, calculateCritical } from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Scenes//Battleground/Systems/CombatStatsTracker";
import { getCharaById, shake } from "@Systems/Chara/Chara";
import { getEnemyCore } from "@Models/Entities/Card";
import { State } from "@Models/State";
import { playSoundEffect } from "@Systems/AudioManager";
import { damageFx } from "./visuals/damage";
import { processReactions } from "../TriggerSystem";

export function dealDamageLogicIO(state: State, sourceUnit: Unit, scale: number = 1) {
	const damageAmount = sourceUnit.power;

	const targetForce = state.battleData.forces.find(
		(force: { id: string }) => force.id !== sourceUnit.force
	)!;

	const enemyCore = getEnemyCore(sourceUnit.force);

	const effect = () => {
		const crit = calculateCritical(sourceUnit);
		const damage = ((damageAmount + crit.bonusPower) * crit.multiplier) * scale;

		const actualLifeChanged = applyDamageToForce(targetForce, damage, 0, "normal", crit.isCritical);
		CombatStatsTracker.trackDamage(state, sourceUnit.id, actualLifeChanged);
		shake(getCharaById(enemyCore.id));

		if (crit.isCritical) {
			processReactions(state, sourceUnit, { id: "on_crit" });
		}

		if (sourceUnit.lifesteal) {
			manipulateCoreLife(getUnitForce(sourceUnit.force), damage);
		}

		if (enemyCore.reflect) {
			const reflected = (damage * enemyCore.reflect) / 100;

			if (reflected > 0) {
				const actualLifeChanged = applyDamageToForce(targetForce, reflected);
				CombatStatsTracker.trackDamage(state, enemyCore.id, actualLifeChanged);
			}
		}
	};

	playSoundEffect('sfx_spell_truestrike');

	damageFx(
		getCharaById(sourceUnit.id),
		getCharaById(enemyCore!.id),
		effect,
	)
}
