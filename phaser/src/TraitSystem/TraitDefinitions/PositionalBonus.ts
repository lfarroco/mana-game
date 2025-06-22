import { TraitDefinition } from "../TraitEffectSystem";
import { TraitId } from "../Traits";

// these are examples
export const frontlineMightTrait: TraitDefinition = {
	id: "frontline_might" as TraitId,
	name: "Frontline Might",
	description: "Gains +20 Attack Power when in the front row.",
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
	description: "Gains +50 Max HP when in the back row.",
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

// To use these, you would register them (e.g., in `TraitSystem.initializeTraitsFromData`)
// and then add them to a card's `traits` array in your card definitions JSON, like:
// { "id": "some_card_id", ..., "traits": [{ "id": "frontline_might" }] }