import { Effect, EffectReaction } from "../TriggerSystem/TriggerSystem";

export type Skill = {
	name: string;
	id: string;
	description: string;
	cardFilters: ((effects: Effect[]) => boolean)[];
	reactions: EffectReaction[];
};

export const skillsIndex: Record<string, Skill> = {
	"player_ally_damage_boost": {
		id: "player_ally_damage_boost",
		name: "Battle Fury",
		description: "When an ally deals damage, all allies gain +10 power",
		cardFilters: [],
		reactions: [
			{
				effectId: "damage",
				position: "allies",
				effects: [
					{
						"id": "increase_power",
						"amount": 10,
						"targets": {
							"id": "all_allies"
						}
					}
				]
			}

		]
	},
	"no_poison": {
		id: "no_poison",
		name: "No Poison",
		description: "You can't draft poison heroes",
		cardFilters: [
			(effects) => !effects.some(e => e.id === "poison")
		],
		reactions: []

	},
	"cpu_poison_damage_boost": {
		id: "cpu_poison_damage_boost",
		name: "Poison Fury",
		description: "When an ally applies poison, all allies gain +10 power",
		cardFilters: [],
		reactions: [
			{
				effectId: "poison",
				position: "allies",
				effects: [
					{
						"id": "increase_power",
						"amount": 10,
						"targets": {
							"id": "all_allies"
						}
					}
				]
			}

		]
	}
};
