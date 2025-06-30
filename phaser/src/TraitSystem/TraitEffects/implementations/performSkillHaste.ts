/**
 * @file Implementation for the haste skill effect.
 * Makes the source unit perform the "haste" skill.
 */

import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { TraitEffectContext, TraitEffectFn } from "../../TraitEffectSystem";

/**
 * Pure function for haste skill logic.
 * Makes the source unit perform the "haste" skill.
 */
export function performSkillHasteLogic(context: TraitEffectContext): {
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
 * Runtime wrapper for the haste skill effect.
 * Handles actual skill execution with proper async handling.
 */
export const performSkillHaste: TraitEffectFn = async (context) => {
  const { sourceUnit, scene } = performSkillHasteLogic(context);
  
  // Dynamic import to avoid circular dependencies in tests
  const { haste } = await import("../../../Systems/Chara/Skills/haste");
  
  await haste(scene, sourceUnit);
};
