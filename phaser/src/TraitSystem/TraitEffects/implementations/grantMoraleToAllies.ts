import { TraitEffectFn } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";
import { manipulateForceMorale } from "../../../Models/Entities/Force";

/**
 * Helper function to manipulate force morale with proper event emission and pop text
 */
async function manipulateForceMorealeWrapper(
	forceId: string,
	amount: number,
	context: any,
	popTextPrefix: string = ""
): Promise<void> {
	const { scene, state, sourceUnit } = context;
	const targetForce = state.battleData.forces.find((f: any) => f.id === forceId);

	if (targetForce) {
		// Use the shared utility function that handles morale damage reduction
		const actualChange = manipulateForceMorale(targetForce, amount, scene);

		// Show pop text for the source unit
		if (actualChange !== 0) {
			const chara = getChara(sourceUnit.id);
			if (chara) {
				const sign = actualChange > 0 ? '+' : '';
				// Helper function to safely show pop text only when the scene and chara are active
				if (chara && chara.active && scene && scene.scene && scene.scene.isActive()) {
					await chara.showPopText(`${popTextPrefix}${sign}${actualChange} Morale`, actualChange > 0 ? "heal" : "damage");
				}
			}
		}
	}
}

/**
 * Effect: Grants morale to allies
 */
export const grantMoraleToAlliesLogic: TraitEffectFn = async (context) => {
	const moraleAmount = getEffectParams(context.traitInstanceParams, context.effectInstance, 'morale', 40);
	await manipulateForceMorealeWrapper(context.sourceUnit.force, moraleAmount, context, "Team ");
};
