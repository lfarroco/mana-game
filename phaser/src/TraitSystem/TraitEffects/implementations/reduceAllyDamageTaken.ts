import { TraitEffectFn } from "../../TraitEffectSystem";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";
import { devlog } from "../../../utils";

/**
 * Effect: Reduces damage taken by all allies
 */
export const reduceAllyDamageTakenLogic: TraitEffectFn = async (context) => {
	const { targets, effectInstance, traitInstanceParams, sourceUnit } = context;
	const reduction = (traitInstanceParams.reduction ?? effectInstance.reduction ?? 12) as number;

	// Add damage reduction tracking to each ally
	for (const ally of targets) {
		// Initialize damage reduction stacks if not present
		if (!ally.damageReductionStacks) {
			ally.damageReductionStacks = [];
		}

		// Add this source's reduction to the stack
		ally.damageReductionStacks.push({
			sourceUnitId: sourceUnit.id,
			reductionPercent: reduction
		});

		const chara = getChara(ally.id);
		if (chara) {
			// Helper function to safely show pop text only when the scene and chara are active
			if (chara && chara.active && context.scene && context.scene.scene && context.scene.scene.isActive()) {
				await chara.showPopText(`Protected (${reduction}%)`);
			}
		}
	}

	devlog(`[Defensive Matrix] ${sourceUnit.name} is protecting ${targets.length} allies with ${reduction}% damage reduction`);
};
