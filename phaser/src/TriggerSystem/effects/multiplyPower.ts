import { getChara } from "../../Scenes/Battleground/Systems/CharaManager";
import { Unit } from "../../Models/Entities/Unit";
import { AudioSystem } from "../../Systems/AudioSystem/AudioSystem";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

/**
 * Effect: Multiplies a unit's power by a given multiplier
 */
export const multiplyPower = async (context: {
	targets: Unit[];
	scene: BattlegroundScene;
	sourceUnit: Unit;
	multiplier: number;
}) => {
	const { targets, multiplier } = context;

	for (const target of targets) {
		console.log(`Multiplying power of ${target.id} by ${multiplier}`);
		const chara = getChara(target.id);
		if (chara) {
			// Calculate the new power value
			const currentPower = target.power;
			const newPower = Math.floor(currentPower * multiplier);
			const powerDifference = newPower - currentPower;

			// Use the existing updateUnitAttribute method to apply the difference
			chara.updateUnitAttribute('power', powerDifference);

			try {
				const audioSystem = AudioSystem.getInstance();
				audioSystem.playSoundEffect('sfx_spell_innerfocus');
			} catch (error) {
				console.warn('Could not play inner focus sound:', error);
			}
		}
	}
};
