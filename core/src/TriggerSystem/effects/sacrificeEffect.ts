import { CombatEnvironment, Unit } from "../../Models";
import { nextRandomValue, pickRandom } from "../../Random";
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
    const effectToRemove = picked[0];
    sourceUnit.effects = sourceUnit.effects.filter((e) => e !== effectToRemove);
  } else {
    const { picked, seed } = pickRandom(env, removableReactions, 1);
    env.seed = seed;
    const reactionToRemove = picked[0];
    sourceUnit.reactions = sourceUnit.reactions.filter(
      (r) => r !== reactionToRemove,
    );
  }

  increasePower(env, [sourceUnit], 10, false, sourceUnit);
};
