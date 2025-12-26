import { getAlliedCore } from "@Models/Entities/Card";
import { calculateCritical, Unit } from "@Models/Entities/Unit";
import { getState, State } from "@Models/State";
import * as RegenSystem from "@Scenes//Battleground/Systems/RegenSystem";
import * as CombatSystemStates from "@Scenes/Battleground/Systems/CombatSystemStates";
import { getCharaById } from "@Systems/Chara/Chara";
import { arcaneMissileTargeted } from "../../Effects";
import { playSoundEffect } from "@Systems/AudioManager";
import * as CombatStatsTracker from "@Scenes/Battleground/Systems/CombatStatsTracker";
import { processReactions } from "../TriggerSystem";

export const applyRegenLogicIO = async (
	state: State,
	sourceUnit: Unit,
	scale: number = 1,
) => {
	const baseAmount = sourceUnit.power * 0.1;

	const crit = calculateCritical(sourceUnit);

	const amount = ((baseAmount + (crit.bonusPower * 0.1)) * crit.multiplier) * scale;

	const targetForce = getState().battleData.forces.find((force) => force.id === sourceUnit.force)!;

	console.log(
		`[ApplyRegen] Unit power: ${sourceUnit.power}, Regen rate: ${amount}, Total healing over time: ${amount * 10}`
	);

	const effect = () => {
		const combatStates = CombatSystemStates.getCombatSystemStates();
		const newRegenState = RegenSystem.applyRegen(
			combatStates.regenSystemState,
			targetForce,
			amount,
			crit.isCritical
		);
		CombatSystemStates.updateRegenSystemState(newRegenState);

		CombatStatsTracker.trackRegen(state, sourceUnit.id, amount);
		if (crit.isCritical) {
			processReactions(state, sourceUnit, { id: "on_crit" });
		}
	};

	const alliedCore = getAlliedCore(state)(sourceUnit.force);

	playSoundEffect('sfx_spell_tranquility');

	arcaneMissileTargeted(getCharaById(sourceUnit.id), getCharaById(alliedCore.id), {
		colors: [0x00ff00, 0x32cd32, 0x7fff00, 0x00ff00], //dark green tones
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
