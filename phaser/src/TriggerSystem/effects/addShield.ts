import { getAlliedCore } from "@Models/Entities/Card";
import { manipulateCoreShield } from "@Models/Entities/Force";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import { getState } from "@Models/State";
import * as CombatStatsTracker from "@Scenes//Battleground/Systems/CombatStatsTracker";
import { getCharaById } from "@Systems/Chara/Chara";
import { playSoundEffect } from "@Systems/AudioManager";
import { shieldFx } from "./visuals/shield";
import { processReactions } from "../TriggerSystem";

export const addShieldLogicIO = async (sourceUnit: Unit) => {
	const baseAmount = sourceUnit.power;

	const sourceForce = getState().battleData.forces.find((force) => force.id === sourceUnit.force)!;
	const alliedCore = getAlliedCore(sourceUnit.force);

	const effect = async () => {
		const crit = calculateCritical(sourceUnit);

		const shieldAmount = (baseAmount + crit.bonusPower) * crit.multiplier;

		const actualShieldChange = manipulateCoreShield(sourceForce, shieldAmount, crit.isCritical, true);

		if (actualShieldChange > 0) {
			CombatStatsTracker.trackShield(sourceUnit.id, actualShieldChange);
		}

		if (crit.isCritical) {
			processReactions(sourceUnit, { id: "on_crit" });
		}
	};

	playSoundEffect('sfx_spell_manavortex');

	shieldFx(
		getCharaById(sourceUnit.id),
		getCharaById(alliedCore.id),
		effect,
	);
};
