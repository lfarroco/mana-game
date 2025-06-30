import { TraitEffectFn } from "../../TraitEffectSystem";
import { GameEvents } from "../../../constants/events";
import { getChara } from "../../../Scenes/Battleground/Systems/CharaManager";

/**
 * Effect: Increases the max and current morale of the source unit's force.
 */
export const increaseForceMaxMoraleLogic: TraitEffectFn = async (context) => {
	const { sourceUnit, effectInstance, traitInstanceParams, scene, state } = context;
	const amount = (traitInstanceParams.amount ?? effectInstance.amount ?? 100) as number;

	// In battle, the forces are in `battleData.forces`.
	const targetForce = state.battleData.forces.find(f => f.id === sourceUnit.force);

	if (targetForce) {
		targetForce.maxMorale += amount;
		// At the start of battle, morale is typically set to maxMorale.
		// So we should increase both.
		targetForce.morale += amount;

		// Emit event for UI update. The MoraleDisplay listens to this.
		scene.events.emit(GameEvents.MORALE_UPDATED, {
			forceId: targetForce.id,
			newMorale: targetForce.morale,
			maxMorale: targetForce.maxMorale,
		});

		const chara = getChara(sourceUnit.id);
		if (chara) {
			// Helper function to safely show pop text only when the scene and chara are active
			if (chara && chara.active && scene && scene.scene && scene.scene.isActive()) {
				await chara.showPopText(`+${amount} Max Morale`);
			}
		}
	}
};
