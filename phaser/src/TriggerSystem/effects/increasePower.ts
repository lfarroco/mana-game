import { getCharaById } from "../../Systems/Chara/Chara";
import { Unit } from "../../Models/Entities/Unit";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import * as AudioManager from "../../Systems/AudioManager";
import * as Chara from "../../Systems/Chara/Chara";

export const increasePower = async (context: {
	targets: Unit[];
	scene: BattlegroundScene;
	sourceUnit: Unit;
	amount: number;
}) => {
	const { targets, amount } = context;

	for (const target of targets) {
		console.log(`Modifying power of ${target.id} by ${amount}`);
		const chara = getCharaById(target.id);
		Chara.updateUnitPower(chara, amount);
		AudioManager.playSoundEffect('sfx_spell_innerfocus');
	}
};
