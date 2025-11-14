import { EffectReaction, Effect } from "./TriggerSystem";


export const reactions: EffectReaction[] = [
	{
		position: 'all',
		effectId: 'damage',
		effects: [
			{
				id: "charge",
				duration: 1000,
				targets: { id: "self" },
			},
		]
	}
];

export const effects: Effect[] = [
	{
		id: "increase_power",
		amount: 5,
		targets: { id: "column_allies" },
	}
];
