import { applyDamageToForce, getUnitForce, manipulateCoreLife } from "@Models/Entities/Force";
import { Unit } from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Scenes//Battleground/Systems/CombatStatsTracker";
import { getCharaById, shake } from "@Systems/Chara/Chara";
import { arcaneMissileTargeted } from "../../Effects/arcaneMissileTargeted";
import { getEnemyCore } from "@Models/Entities/Card";
import { getState } from "@Models/State";

export function dealDamageLogicIO(sourceUnit: Unit) {
	const damageAmount = sourceUnit.power;

	const targetForce = getState().battleData.forces.find(
		(force: { id: string }) => force.id !== sourceUnit.force
	)!;

	const enemyCore = getEnemyCore(sourceUnit.force);

	const effect = () => {
		let damage = damageAmount;

		const isCritical = sourceUnit.critical ? Math.random() < sourceUnit.critical / 100 : false;
		if (isCritical) {
			damage = damageAmount * 2;
		}

		const actualLifeChanged = applyDamageToForce(targetForce, damage, 0, "normal", isCritical);
		CombatStatsTracker.trackDamage(sourceUnit.id, actualLifeChanged, "normal");
		shake(getCharaById(enemyCore.id));

		if (sourceUnit.lifesteal) {
			manipulateCoreLife(getUnitForce(sourceUnit.force), damage);
		}

		if (enemyCore.reflect) {
			const reflected = (damage * enemyCore.reflect) / 100;

			if (reflected > 0) {
				const actualLifeChanged = applyDamageToForce(targetForce, reflected);
				CombatStatsTracker.trackDamage(sourceUnit.id, actualLifeChanged, "reflect");
			}
		}
	};

	arcaneMissileTargeted(getCharaById(sourceUnit.id), getCharaById(enemyCore!.id), {
		// Red tones
		colors: [0x880808, 0xee4b2b, 0xd22b2b], //blood red, bright red, cadmium red
		amplitudeMin: 5,
		amplitudeMax: 20,
		particleScale: 1.5,
		impact: {
			colors: [0xd2691e, 0xcd853f],
			scale: 2,
			speed: 200,
			lifespan: 300,
			alpha: 0.4,
		},
		onHit: effect,
	});
}
