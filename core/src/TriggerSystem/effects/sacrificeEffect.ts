import { CombatEnvironment, Unit } from "../../Models";
import { nextRandomValue, pickRandom } from "../../Random";
import { removeUnitEffect, removeUnitReaction } from "../../Entities/Unit";
import { increasePower } from "./increasePower";

export const sacrificeEffect = (env: CombatEnvironment, sourceUnit: Unit) => {
  const removableEffects = sourceUnit.effects;
  const removableReactions = sourceUnit.reactions;

  const hasEffects = removableEffects.length > 0;
  const hasReactions = removableReactions.length > 0;

  if (!hasEffects && !hasReactions) return;

  // Random choice between effect or reaction
  let removeType: "effect" | "reaction";
  if (hasEffects && hasReactions) {
    const { result: roll, seed: nextSeed } = nextRandomValue(env);
    env.seed = nextSeed;
    removeType = roll < 0.5 ? "effect" : "reaction";
  } else {
    removeType = hasEffects ? "effect" : "reaction";
  }

  if (removeType === "effect") {
    const { picked, seed } = pickRandom(env, removableEffects, 1);
    env.seed = seed;
    // Combat runs on session-unit clones; syncing the grant ledger here keeps
    // the post-combat write-back from resurrecting the sacrificed ability on
    // the next rank-up.
    removeUnitEffect(sourceUnit, picked[0]);
  } else {
    const { picked, seed } = pickRandom(env, removableReactions, 1);
    env.seed = seed;
    removeUnitReaction(sourceUnit, picked[0]);
  }

  increasePower(env, [sourceUnit], 10, false, sourceUnit);
};
