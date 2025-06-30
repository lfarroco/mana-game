/**
 * @file Implementation for the healing wave skill effect.
 * Makes the source unit perform the "healing wave" skill.
 */

import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { TraitEffectContext, TraitEffectFn } from "../../TraitEffectSystem";

/**
 * Pure function for healing wave skill logic.
 * Makes the source unit perform the "healing wave" skill.
 */
export function performSkillHealingWaveLogic(context: TraitEffectContext): {
	sourceUnit: Unit;
	scene: BattlegroundScene;
} {
	const { sourceUnit, scene } = context;

	return {
		sourceUnit,
		scene
	};
}

/**
 * Runtime wrapper for the healing wave skill effect.
 * Handles actual skill execution with proper async handling.
 */
export const performSkillHealingWave: TraitEffectFn = async (context) => {
	const { sourceUnit, scene } = performSkillHealingWaveLogic(context);

	// Dynamic import to avoid circular dependencies in tests
	const { healingWave } = await import("../../../Systems/Chara/Skills/healingWave");

	await healingWave(scene, sourceUnit);
};
