import { getChara } from "../../Scenes/Battleground/Systems/CharaManager";
import { Unit } from "../../Models/Entities/Unit";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { audioManager } from "../../Systems/AudioManager";

/**
 * Effect: Modifies a unit's power
 * TODO: rename to addPower
 */
export const increasePower = async (context: {
	targets: Unit[];
	scene: BattlegroundScene;
	sourceUnit: Unit;
	amount: number;
}) => {
	const { targets, amount } = context;

	for (const target of targets) {
		console.log(`Modifying power of ${target.id} by ${amount}`);
		const chara = getChara(target.id);
		if (chara) {
			chara.updateUnitAttribute('power', amount);
			try {
				audioManager.playSoundEffect('sfx_spell_innerfocus');
			} catch (error) {
				console.warn('Could not play inner focus sound:', error);
			}
		}
	}
};
