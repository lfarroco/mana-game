import { Unit } from "../../Models";
import { nextValue, pickRandom } from "../../Random";
import { increasePower } from "./increasePower";
import { CombatEnvironment } from "../../CombatTypes";

export const sacrificeEffect = (
	env: CombatEnvironment,
	sourceUnit: Unit,
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
		const effectToRemove = pickRandom(env.session, removableEffects, 1)[0];
		sourceUnit.effects = sourceUnit.effects.filter((e) => e !== effectToRemove);
	} else {
		const reactionToRemove = pickRandom(
			env.session,
			removableReactions,
			1)[0];
		sourceUnit.reactions = sourceUnit.reactions.filter((r) => r !== reactionToRemove);
	}

	increasePower(env, [sourceUnit], 10, false, sourceUnit);
};