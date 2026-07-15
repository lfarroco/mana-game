import { Unit } from "@Models/Entities/Unit";
import { nextValue } from "@Utils/Random";
import { pickRandom } from "@utils";
import { increasePower } from "@TriggerSystem/effects/increasePower";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";

export const sacrificeEffect = (
	env: CombatEnvironment,
	sourceUnit: Unit,
	delayedExecution?: number
) => {
	const removableEffects = sourceUnit.effects;
	const removableReactions = sourceUnit.reactions;

	const hasEffects = removableEffects.length > 0;
	const hasReactions = removableReactions.length > 0;

	if (!hasEffects && !hasReactions) return;

	// Random choice between effect or reaction
	let removeType: "effect" | "reaction";
	if (hasEffects && hasReactions) {
		removeType = nextValue() < 0.5 ? "effect" : "reaction";
	} else {
		removeType = hasEffects ? "effect" : "reaction";
	}

	if (removeType === "effect") {
		const effectToRemove = pickRandom(removableEffects, 1)[0];
		sourceUnit.effects = sourceUnit.effects.filter((e) => e !== effectToRemove);
	} else {
		const reactionToRemove = pickRandom(removableReactions, 1)[0];
		sourceUnit.reactions = sourceUnit.reactions.filter((r) => r !== reactionToRemove);
	}

	increasePower(env, [sourceUnit], 10, false, sourceUnit, delayedExecution);
};