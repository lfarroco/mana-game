import { getAlliedCore } from "@Models/Entities/Card";
import { arcaneMissileTargeted } from "../../Effects";
import { Force, getUnitForce, manipulateCoreLife } from "@Models/Entities/Force";
import { isCritical, Unit } from "@Models/Entities/Unit";
import * as CombatStatsTracker from "@Scenes/Battleground/Systems/CombatStatsTracker";
import { getCharaById } from "@Systems/Chara/Chara";
import { reducePoison } from "@Scenes/Battleground/RunCombatIO";

export const restoreLife = async (sourceUnit: Unit) => {
	const baseAmount = sourceUnit.power;

	const critical = isCritical(sourceUnit);

	const healAmount = critical ? baseAmount * 2 : baseAmount;

	const effect = (targetForce: Force, amount: number) => () => {
		const actualHealing = manipulateCoreLife(targetForce, amount, critical);

		if (actualHealing > 0) {
			CombatStatsTracker.trackHealing(sourceUnit.id, actualHealing, "direct");
		}

		if (actualHealing > 0) {
			reducePoison(targetForce.id, actualHealing);
		}
	};

	CombatStatsTracker.trackLifeRestored({
		unit: sourceUnit,
		amount: sourceUnit.power,
		type: "direct",
		sourceUnitId: sourceUnit.id,
	});

	const sourceForce = getUnitForce(sourceUnit.id);
	const alliedCore = getAlliedCore(sourceUnit.force);

	arcaneMissileTargeted(getCharaById(sourceUnit.id), getCharaById(alliedCore.id), {
		colors: [0x00ff00, 0x32cd32, 0x7fff00], // Green colors
		amplitudeMin: 5,
		amplitudeMax: 15,
		particleScale: 1.5,
		impact: {
			colors: [0x00ff00, 0x32cd32],
			scale: 2,
			speed: 200,
			lifespan: 300,
			alpha: 0.4,
		},
		onHit: effect(sourceForce, healAmount),
	});
};
