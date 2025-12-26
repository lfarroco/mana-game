import { getAlliedCore } from "@Models/Entities/Card";
import { manipulateCoreShield } from "@Models/Entities/Force";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import { State } from "@Models/State";
import * as CombatStatsTracker from "@Scenes//Battleground/Systems/CombatStatsTracker";
import { getCharaById } from "@Systems/Chara/Chara";
import { playSoundEffect } from "@Systems/AudioManager";
import { shieldFx } from "./visuals/shield";
import { processReactions } from "../TriggerSystem";

export const addShieldLogicIO = async (
	state: State,
	sourceUnit: Unit,
	scale: number = 1,
) => {
	const baseAmount = sourceUnit.power;
	const sourceForce = state.battleData.forces.find((force) => force.id === sourceUnit.force)!;
	const alliedCore = getAlliedCore(state)(sourceUnit.force);

	const effect = async () => {
		const crit = calculateCritical(sourceUnit);

		const shieldAmount = ((baseAmount + crit.bonusPower) * crit.multiplier) * scale;

		const actualShieldChange = manipulateCoreShield(sourceForce, shieldAmount, crit.isCritical, true);

		if (actualShieldChange > 0) {
			CombatStatsTracker.trackShield(state, sourceUnit.id, actualShieldChange);
		}

		if (crit.isCritical) {
			processReactions(state, sourceUnit, { id: "on_crit" });
		}
	};

	playSoundEffect('sfx_spell_manavortex');

	shieldFx(
		getCharaById(sourceUnit.id),
		getCharaById(alliedCore.id),
		effect,
	);
};
