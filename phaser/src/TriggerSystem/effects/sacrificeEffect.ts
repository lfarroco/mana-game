import { Unit } from "@Models/Entities/Unit";
import { pickRandom } from "../../utils";
import { increasePower } from "./increasePower";

export const sacrificeEffect = (sourceUnit: Unit) => {
	const removableEffects = sourceUnit.effects;
	const removableReactions = sourceUnit.reactions;

	const hasEffects = removableEffects.length > 0;
	const hasReactions = removableReactions.length > 0;

	if (!hasEffects && !hasReactions) return;

	let removeType: "effect" | "reaction";
	if (hasEffects && hasReactions) {
		removeType = Math.random() < 0.5 ? "effect" : "reaction";
	} else {
		removeType = hasEffects ? "effect" : "reaction";
	}

	if (removeType === "effect") {
		const effectToRemove = pickRandom(removableEffects, 1)[0];
		sourceUnit.effects = sourceUnit.effects.filter(e => e !== effectToRemove);
	} else {
		const reactionToRemove = pickRandom(removableReactions, 1)[0];
		sourceUnit.reactions = sourceUnit.reactions.filter(r => r !== reactionToRemove);
	}

	increasePower([sourceUnit], 10, false, sourceUnit);
};
