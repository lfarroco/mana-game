import { TraitEffectFn } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";
import { Unit } from "../../../Models/Entities/Unit";
import { AudioSystem } from "../../../Systems/AudioSystem/AudioSystem";

/**
 * Effect: Modifies a stat passively (permanently)
 */
export const modifyStatPassiveLogic: TraitEffectFn = async (context) => {
	const { targets } = context;
	const attribute = getEffectParams(context.traitInstanceParams, context.effectInstance, 'attribute', 'power') as keyof Unit;
	const amount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'amount', 0);

	if (!attribute || amount === 0) {
		if (process.env.NODE_ENV === 'development') {
			console.error(`Modify stat effect is missing required parameters (attribute, amount).`, { attribute, amount });
		}
		return;
	}

	for (const target of targets) {
		console.log(`Modifying ${attribute} of ${target.id} by ${amount}`);
		const chara = getChara(target.id);
		if (chara) {
			chara.updateUnitAttribute(attribute, amount);
			try {
				const audioSystem = AudioSystem.getInstance();
				audioSystem.playSoundEffect('sfx_spell_innerfocus');
			} catch (error) {
				console.warn('Could not play inner focus sound:', error);
			}
		}
	}
};
