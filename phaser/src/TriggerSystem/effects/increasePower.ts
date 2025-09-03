import { Unit } from "@Models/Entities/Unit";
import * as AudioManager from "@Systems/AudioManager";
import { getCharaById, updateUnitPower } from "@Systems/Chara/Chara";

export const increasePower = async (
	targets: Unit[],
	amount: number
) => {

	for (const target of targets) {
		console.log(`Modifying power of ${target.id} by ${amount}`);
		const chara = getCharaById(target.id);
		updateUnitPower(chara, amount);
		AudioManager.playSoundEffect('sfx_spell_innerfocus');
	}
};
