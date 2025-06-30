import { TraitEffectFn } from "../../TraitEffectSystem";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";
import { devlog } from "../../../utils";

/**
 * Effect: Reduces morale loss by a percentage for the unit's force.
 * This creates a passive protective effect that makes tank units more valuable.
 */
export const moraleDamageReductionLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance } = context;
	const reductionPercent = effectInstance.reduction_percent || 10;

	// Get the source unit's force
	const sourceForce = context.state.battleData.forces.find(force =>
		force.units.some(unit => unit.id === sourceUnit.id)
	);

	if (!sourceForce) return;

	// Initialize morale reduction stacks if not present
	if (!sourceForce.moraleReductionStacks) {
		sourceForce.moraleReductionStacks = [];
	}

	// Add this unit's reduction to the stack
	sourceForce.moraleReductionStacks.push({
		unitId: sourceUnit.id,
		reductionPercent: reductionPercent
	});

	// Show activation feedback
	const chara = getChara(sourceUnit.id);
	if (chara) {
		// Helper function to safely show pop text only when the scene and chara are active
		if (chara && chara.active && context.scene && context.scene.scene && context.scene.scene.isActive()) {
			await chara.showPopText(`Morale Guardian Active`, "heal");
		}
	}

	devlog(`[Morale Guardian] ${sourceUnit.name} is protecting force ${sourceForce.id} with ${reductionPercent}% morale damage reduction`);
};
