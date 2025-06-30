/**
 * @file Implementation for the arcane missiles skill effect.
 * Makes the source unit perform the "arcane missiles" skill with configurable projectiles.
 */

import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { TraitEffectContext, TraitEffectFn } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";

/**
 * Pure function for arcane missiles skill logic.
 * Makes the source unit perform the "arcane missiles" skill.
 * Can take `projectiles` parameter from trait/effect data.
 */
export function performSkillArcaneMissilesLogic(context: TraitEffectContext): {
  sourceUnit: Unit;
  scene: BattlegroundScene;
  projectiles: number;
} {
  const { sourceUnit, scene } = context;
  const projectiles = getEffectParams(context.traitInstanceParams, context.effectInstance, 'projectiles', 3);
  
  return {
    sourceUnit,
    scene,
    projectiles
  };
}

/**
 * Runtime wrapper for the arcane missiles skill effect.
 * Handles actual skill execution with proper async handling.
 */
export const performSkillArcaneMissiles: TraitEffectFn = async (context) => {
  const { sourceUnit, scene, projectiles } = performSkillArcaneMissilesLogic(context);
  
  // Dynamic import to avoid circular dependencies in tests
  const { arcaneMissiles } = await import("../../../Systems/Chara/Skills/arcaneMissiles");
  
  await arcaneMissiles(scene)(sourceUnit, projectiles);
};
