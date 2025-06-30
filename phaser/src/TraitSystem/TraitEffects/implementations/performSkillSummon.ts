/**
 * @file Implementation for the summon skill effect.
 * Makes the source unit perform the "summon" skill with a specified card.
 */

import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { TraitEffectContext, TraitEffectFn } from "../../TraitEffectSystem";
import { getEffectParams } from "../../TraitSystem.pure";

/**
 * Pure function for summon skill logic.
 * Makes the source unit perform the "summon" skill.
 * Requires `cardIdToSummon` parameter from trait/effect data.
 */
export function performSkillSummonLogic(context: TraitEffectContext): {
  sourceUnit: Unit;
  scene: BattlegroundScene;
  cardIdToSummon: string;
  shouldExecute: boolean;
} {
  const { sourceUnit, scene } = context;
  const cardIdToSummon = getEffectParams(context.traitInstanceParams, context.effectInstance, 'cardIdToSummon', '');
  
  return {
    sourceUnit,
    scene,
    cardIdToSummon,
    shouldExecute: !!cardIdToSummon
  };
}

/**
 * Runtime wrapper for the summon skill effect.
 * Handles actual skill execution with proper async handling.
 */
export const performSkillSummon: TraitEffectFn = async (context) => {
  const { sourceUnit, cardIdToSummon, shouldExecute } = performSkillSummonLogic(context);
  
  if (!shouldExecute) {
    console.warn(`Summon effect: Chara for sourceUnit ${sourceUnit.id} not found, or cardIdToSummon missing. Card ID: ${cardIdToSummon}`);
    return;
  }
  
  // Dynamic import to avoid circular dependencies in tests
  const { getChara } = await import("../../../Scenes/Battleground/Systems/CharaManager");
  const { summon } = await import("../../../Systems/Chara/Skills/summon");
  
  const chara = getChara(sourceUnit.id);
  if (chara) {
    await summon(chara, cardIdToSummon);
  } else {
    console.warn(`Summon effect: Chara for sourceUnit ${sourceUnit.id} not found, or cardIdToSummon missing. Card ID: ${cardIdToSummon}`);
  }
};
