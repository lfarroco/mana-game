import { Chara } from "../../Systems/Chara";
import { Unit } from "../../Models/Entities/Unit";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { playSoundEffect } from "../../Systems/AudioManager";

export const multiplyPower = async (context: {
	targets: Unit[];
	scene: BattlegroundScene;
	sourceUnit: Unit;
	multiplier: number;
}) => {
	const { targets, multiplier } = context;

	for (const target of targets) {
		console.log(`Multiplying power of ${target.id} by ${multiplier}`);
		const chara = Chara.getCharaById(target.id);
		const currentPower = target.power;
		const newPower = Math.floor(currentPower * multiplier);
		const powerDifference = newPower - currentPower;

		Chara.updateUnitPower(chara, powerDifference);

		playSoundEffect('sfx_spell_innerfocus');
	}
};
