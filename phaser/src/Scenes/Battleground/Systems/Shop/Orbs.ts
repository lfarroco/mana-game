import { Unit } from "@Models/Entities/Unit";
import { getReactionDescription } from "@Systems/Chara/CharaTooltip";
import { increasePower } from "../../../../TriggerSystem/effects";
import * as TriggerSystem from "../../../../TriggerSystem/TriggerSystem";
import { pickOne } from "../../../../utils";

export type OrbSpec = {
	id: string;
	name: string;
	color: number;
	tooltip: string;
	// return false to indicate the effect was not applied and the orb should return
	effect: (unit: Unit) => boolean;
};

const generateReactionOrb = () => {
	const reactionSourceEffects: TriggerSystem.EffectId[] = ["shield", "heal", "haste", "damage", "slow", "regen", "poison"];

	const positions = [
		{
			power: 2,
			source: TriggerSystem.EFFECT_SOURCE_POSITIONS.column_allies,
		},
		{
			power: 2,
			source: TriggerSystem.EFFECT_SOURCE_POSITIONS.row_allies,
		},
		{
			power: 6,
			source: TriggerSystem.EFFECT_SOURCE_POSITIONS.left_ally,
		},
		{
			power: 6,
			source: TriggerSystem.EFFECT_SOURCE_POSITIONS.right_ally,
		},
		{
			power: 6,
			source: TriggerSystem.EFFECT_SOURCE_POSITIONS.top_ally,
		},
		{
			power: 6,
			source: TriggerSystem.EFFECT_SOURCE_POSITIONS.bottom_ally,
		},
	];

	const effect = pickOne(reactionSourceEffects);
	const position = pickOne(positions);
	const resulttingEffData = {
		id: "increase_power",
		amount: position.power,
		targets: {
			id: "self",
		},
	};

	const resultingEffect = {
		id: "reaction_orb",
		referencePower: 2,
		data: {
			effectId: effect,
			position: position.source as TriggerSystem.EffectSourcePosition,
			effects: [resulttingEffData],
		} as TriggerSystem.EffectReaction,
	};

	return {
		id: "reaction_orb",
		name: "Reaction Orb: " + effect,
		color: 0xffcc00,
		tooltip: [
			`Adds ${getReactionDescription(resultingEffect.data, resultingEffect.referencePower)}`,
			"A unit can have just one reaction (⚡)",
		].join("\n"),
		effect: (unit: Unit) => {
			return setReaction(unit, {
				effectId: effect,
				position: position.source,
				effects: [
					{
						id: "increase_power",
						amount: position.power,
						targets: {
							id: "self",
						},
					},
				],
			});
		},
	};
};

const generateSkillPowerUpOrb = () => {
	const powerTargetEffects: TriggerSystem.EffectId[] = ["heal", "damage", "shield", "regen", "poison"];

	const effectId = pickOne(powerTargetEffects);
	const amount = 10;

	return {
		id: "power_orb",
		name: `Power Up: ${effectId}`,
		color: 0x00ff88,
		tooltip: [
			`[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]+power[/color] [color=#ffd93d]+${amount}[/color]`,
			`[color=#c0c0c0]Condition:[/color] [color=#ffa94d]Unit must have effect '${effectId}'[/color]`,
		].join("\n"),
		effect: (unit: Unit) => {
			if (!unit.effects.some((e) => e.id === effectId)) return false;
			increasePower([unit], amount, false);
			return true;
		},
	};
};

const generateChargeReactionOrb = () => {
	const reactionSourceEffects: TriggerSystem.EffectId[] = ["shield", "heal", "haste", "damage", "slow", "regen", "poison"];

	const positions: Array<{ amount: number; source: TriggerSystem.EffectSourcePosition }> = [
		{ amount: 400, source: TriggerSystem.EFFECT_SOURCE_POSITIONS.column_allies },
		{ amount: 400, source: TriggerSystem.EFFECT_SOURCE_POSITIONS.row_allies },
		{ amount: 900, source: TriggerSystem.EFFECT_SOURCE_POSITIONS.left_ally },
		{ amount: 900, source: TriggerSystem.EFFECT_SOURCE_POSITIONS.right_ally },
		{ amount: 900, source: TriggerSystem.EFFECT_SOURCE_POSITIONS.top_ally },
		{ amount: 900, source: TriggerSystem.EFFECT_SOURCE_POSITIONS.bottom_ally },
	];

	const effectId = pickOne(reactionSourceEffects);
	const position = pickOne(positions);

	const reactionData: TriggerSystem.EffectReaction = {
		effectId,
		position: position.source,
		effects: [
			{
				id: "charge",
				duration: position.amount,
				targets: { id: "self" },
			},
		],
	};

	return {
		id: "charge_reaction_orb",
		name: `Charge: ${effectId}`,
		color: 0xffe066,
		tooltip: [
			`Adds ${getReactionDescription(reactionData, position.amount)}`,
			"A unit can have just one reaction (⚡)",
		].join("\n"),
		effect: (unit: Unit) => {
			return setReaction(unit, reactionData);
		},
	};
};

// Orb effect functions (pure)
function crimsonOrbEffect(unit: Unit) {
	increasePower([unit], 5, false);
	console.log(`Crimson Orb applied to ${unit.id}, new power: ${unit.power}`);
	return true;
}

function addEffectSafely(unit: Unit, effect: TriggerSystem.Effect) {
	if (!canAddEffect(unit)) {
		console.log(`Cannot add effect to ${unit.id}: max effects reached`);
		return false;
	}
	unit.effects.push(effect);
	return true;
}

function canAddEffect(unit: Unit) {
	const totalEffects = unit.effects.length;
	const totalReactions = unit.reactions.length;
	return totalEffects + totalReactions < 3;
}

function canAddReaction(unit: Unit) {
	return unit.reactions.length < 1;
}

function setReaction(unit: Unit, reaction: TriggerSystem.EffectReaction) {
	if (!canAddReaction(unit)) {
		console.log(`Cannot add reaction to ${unit.id}: reaction already present`);
		return false;
	}
	unit.reactions = [reaction];
	return true;
}

// Orb specs as plain data (lookup object)
export const orbsIndex: Record<
	string,
	() => {
		id: string;
		name: string;
		color: number;
		tooltip: string;
		effect: (unit: Unit) => boolean;
	}
> = {
	crimson_orb: () => ({
		id: "crimson_orb",
		name: "Crimson Orb",
		color: 0xff3333,
		tooltip: [
			"[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]+power[/color] [color=#ffd93d]+5[/color]",
			"[color=#c0c0c0]Target:[/color] [color=#e0e0e0]Any unit[/color]",
		].join("\n"),
		effect: crimsonOrbEffect,
	}),
	emerald_orb: generateSkillPowerUpOrb,
	azure_orb: () => ({
		id: "azure_orb",
		name: "Azure Orb",
		color: 0x3399ff,
		tooltip: "Reduce cooldown by 0.2s (minimum of 1s)",
		effect: (unit: Unit) => {
			unit.cooldown = Math.max(1000, unit.cooldown - 200);
			return true;
		},
	}),
	golden_orb: generateReactionOrb,
	violet_orb: () => ({
		id: "violet_orb",
		name: "Violet Orb",
		color: 0x9933ff,
		tooltip: "Makes a unit forget its reaction",
		effect: (unit: Unit) => {
			unit.reactions = [];
			return true;
		},
	}),
	charge_orb: generateChargeReactionOrb,
	positional_power_orb: generatePositionalPowerOrb,
	positional_skill_power_orb: generatePositionalSkillPowerOrb,
	positional_typed_power_orb: generatePositionalTypedPowerOrb,
};

// Increase X Power to some_position (x depends on position generality)
function generatePositionalPowerOrb() {
	// Map targets to power amounts: general (row/column) -> lower, adjacent -> higher
	const options: Array<{
		target: {
			id: "row_allies" | "column_allies" | "left_ally" | "right_ally" | "top_ally" | "bottom_ally";
		};
		amount: number;
		label: string;
	}> = [
			{ target: { id: "row_allies" }, amount: 2, label: "Row Allies" },
			{ target: { id: "column_allies" }, amount: 2, label: "Column Allies" },
			{ target: { id: "left_ally" }, amount: 6, label: "Left Ally" },
			{ target: { id: "right_ally" }, amount: 6, label: "Right Ally" },
			{ target: { id: "top_ally" }, amount: 6, label: "Top Ally" },
			{ target: { id: "bottom_ally" }, amount: 6, label: "Bottom Ally" },
		];

	const choice = pickOne(options);

	return {
		id: "positional_power_orb",
		name: `Power Up: ${choice.label}`,
		color: 0x33ffaa,
		tooltip: [
			`[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]+power[/color] [color=#ffd93d]+${choice.amount}[/color]`,
			`[color=#c0c0c0]Target:[/color] [color=#e0e0e0]${choice.label}[/color]`,
		].join("\n"),
		effect: (unit: Unit) => {
			return addEffectSafely(unit, {
				id: "increase_power",
				amount: choice.amount,
				targets: choice.target,
			});
		},
	};
}

// Increase X Power to some_position, but only if the unit has a randomized effect type (damage/heal/shield/regen/poison)
function generatePositionalSkillPowerOrb() {
	const skillTypes: TriggerSystem.EffectId[] = ["heal", "damage", "shield", "regen", "poison"];
	const effectId = pickOne([...skillTypes]);

	const options: Array<{
		target: {
			id: "row_allies" | "column_allies" | "left_ally" | "right_ally" | "top_ally" | "bottom_ally";
		};
		amount: number;
		label: string;
	}> = [
			{ target: { id: "row_allies" }, amount: 2, label: "↔️" },
			{ target: { id: "column_allies" }, amount: 2, label: "↕️" },
			{ target: { id: "left_ally" }, amount: 6, label: "⬅️" },
			{ target: { id: "right_ally" }, amount: 6, label: "➡️" },
			{ target: { id: "top_ally" }, amount: 6, label: "⬆️" },
			{ target: { id: "bottom_ally" }, amount: 6, label: "⬇️" },
		];

	const choice = pickOne(options);

	return {
		id: "positional_skill_power_orb",
		name: `Power Up: ${choice.label} (${effectId})`,
		color: 0x44ffd1,
		tooltip: [
			`[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]+power[/color] [color=#ffd93d]+${choice.amount}[/color]`,
			`[color=#c0c0c0]Target:[/color] [color=#e0e0e0]${choice.label}[/color]`,
			`[color=#c0c0c0]Condition:[/color] [color=#ffa94d]Caster of type '${effectId}'[/color]`,
		].join("\n"),
		effect: (unit: Unit) => {
			if (!(unit.effects || []).some((e) => e.id === effectId)) return false;
			return addEffectSafely(unit, {
				id: "increase_power",
				amount: choice.amount,
				targets: choice.target,
			});
		},
	};
}

// Increase X Power to some_position only for units that HAVE a specific randomized effect type
function generatePositionalTypedPowerOrb() {
	const skillTypes: TriggerSystem.EffectId[] = ["heal", "damage", "shield", "regen", "poison"];
	const effectId = pickOne([...skillTypes]);

	const options: Array<{
		target: {
			id: "row_allies" | "column_allies" | "left_ally" | "right_ally" | "top_ally" | "bottom_ally";
		};
		amount: number;
		label: string;
	}> = [
			{ target: { id: "row_allies" }, amount: 2, label: "↔️" },
			{ target: { id: "column_allies" }, amount: 2, label: "↕️" },
			{ target: { id: "left_ally" }, amount: 6, label: "⬅️" },
			{ target: { id: "right_ally" }, amount: 6, label: "➡️" },
			{ target: { id: "top_ally" }, amount: 6, label: "⬆️" },
			{ target: { id: "bottom_ally" }, amount: 6, label: "⬇️" },
		];

	const choice = pickOne(options);

	return {
		id: "positional_typed_power_orb",
		name: `${choice.label} (${effectId})`,
		color: 0x22ccff,
		tooltip: [
			`[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]+power[/color] [color=#ffd93d]+${choice.amount}[/color]`,
			`[color=#c0c0c0]Target:[/color] [color=#e0e0e0]${choice.label}[/color]`,
			`[color=#c0c0c0]Condition:[/color] [color=#ffa94d]Target must have '${effectId}'[/color]`,
		].join("\n"),
		effect: (unit: Unit) => {
			return addEffectSafely(unit, {
				id: "increase_power",
				amount: choice.amount,
				targets: choice.target,
				targetEffectId: effectId,
			} as any);
		},
	};
}
