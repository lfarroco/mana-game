import { getAlliedCore } from "@Models/Entities/Card";
import { manipulateCoreShield } from "@Models/Entities/Force";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import { getState } from "@Models/State";
import * as CombatStatsTracker from "@Scenes//Battleground/Systems/CombatStatsTracker";
import { getCharaById } from "@Systems/Chara/Chara";
import { arcaneMissileTargeted } from "../../Effects";
import { playSoundEffect } from "@Systems/AudioManager";

export const addShieldLogicIO = async (sourceUnit: Unit) => {
	const baseAmount = sourceUnit.power;

	const sourceForce = getState().battleData.forces.find((force) => force.id === sourceUnit.force)!;
	const alliedCore = getAlliedCore(sourceUnit.force);

	const effect = async () => {
		const crit = calculateCritical(sourceUnit);

		const shieldAmount = baseAmount * crit.multiplier;

		const actualShieldChange = manipulateCoreShield(sourceForce, shieldAmount, crit.isCritical, true);

		if (actualShieldChange > 0) {
			CombatStatsTracker.trackShield(sourceUnit.id, actualShieldChange);
		}
	};


	playSoundEffect('sfx_spell_manavortex');

	arcaneMissileTargeted(getCharaById(sourceUnit.id), getCharaById(alliedCore.id), {
		colors: [0x00ff00, 0x32cd32, 0x7fff00], //golden tones
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
		onHit: effect,
	});
};
