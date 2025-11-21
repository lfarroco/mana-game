import { Unit } from "@Models/Entities/Unit";
import { playSoundEffect } from "@Systems/AudioManager";
import { getCharaById, updateUnitPower } from "@Systems/Chara/Chara";

export const multiplyPower = async (context: {
	targets: Unit[];
	sourceUnit: Unit;
	multiplier: number;
}) => {
	const { targets, multiplier } = context;

	for (const target of targets) {
		console.log(`Multiplying power of ${target.id} by ${multiplier}`);
		const chara = getCharaById(target.id);
		const currentPower = target.power;
		const newPower = Math.floor(currentPower * multiplier);
		const powerDifference = newPower - currentPower;

		updateUnitPower(chara, powerDifference);

		playSoundEffect("sfx_spell_innerfocus");
	}
};
