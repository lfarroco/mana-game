/**
 * @file Implementation for the slow skill effect.
 * Makes the source unit perform the "slow" skill.
 */

import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { TraitEffectContext, TraitEffectFn } from "../../TraitEffectSystem";

/**
 * Pure function for slow skill logic.
 * Makes the source unit perform the "slow" skill.
 */
export function performSkillSlowLogic(context: TraitEffectContext): {
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
 * Runtime wrapper for the slow skill effect.
 * Handles actual skill execution with proper async handling.
 */
export const performSkillSlow: TraitEffectFn = async (context) => {
  const { sourceUnit, scene } = performSkillSlowLogic(context);
  
  // Dynamic import to avoid circular dependencies in tests
  const { slow } = await import("../../../Systems/Chara/Skills/slow");
  
  await slow(scene, sourceUnit);
};
