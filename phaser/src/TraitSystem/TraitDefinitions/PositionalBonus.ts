import { TraitDefinition } from "../TraitEffectSystem";
import { TraitId } from "../Traits";

// these are example traits
export const frontlineMightTrait: TraitDefinition = {
	id: "frontline_might" as TraitId,
	name: "Frontline Might",
	description: "Gains +{amount} Attack Power when in the {row} row.",
	categories: ["positional", "offensive"],
	effects: [
		{
			effectId: "positional_bonus",
			eventTrigger: "onBattleStart", // This effect is checked once at the start of battle
			targetSelector: "self",
			attribute: "attackPower",
			amount: 20,
			row: "front"
		}
	]
};

export const backlineBulwarkTrait: TraitDefinition = {
	id: "backline_bulwark" as TraitId,
	name: "Backline Bulwark",
	description: "Gains +{amount} Max HP when in the {row} row.",
	categories: ["positional", "defensive"],
	effects: [
		{
			effectId: "positional_bonus",
			eventTrigger: "onBattleStart",
			targetSelector: "self",
			attribute: "maxHp",
			amount: 50,
			row: "back"
		}
	]
};