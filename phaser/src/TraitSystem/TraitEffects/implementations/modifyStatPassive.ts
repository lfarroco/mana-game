import { TraitEffectFn } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";
import { Unit } from "../../../Models/Entities/Unit";

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

	if (targets.length === 0) {
		throw new Error(`Modify stat effect has no valid targets: ${JSON.stringify(context.traitInstanceParams)}`);
	}

	for (const target of targets) {
		console.log(`Modifying ${attribute} of ${target.id} by ${amount}`);
		const chara = getChara(target.id);
		if (chara) {
			chara.updateUnitAttribute(attribute, amount);
		}
	}
};
