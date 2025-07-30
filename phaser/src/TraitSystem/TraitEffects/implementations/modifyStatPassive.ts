import { TraitEffectFn } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";
import { Unit } from "../../../Models/Entities/Unit";

/**
 * Effect: Modifies a stat passively (permanently)
 */
export const modifyStatPassiveLogic: TraitEffectFn = async (context) => {
	const { targets, scene } = context;
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
			scene.sound.play('sfx_spell_innerfocus')
		}
	}
};
