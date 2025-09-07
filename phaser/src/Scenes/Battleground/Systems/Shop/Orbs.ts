import { MagicOrb, MagicOrbCallbacks } from "../../../../components/MagicOrb/MagicOrb";
import * as Phaser from "phaser";
import * as Board from "@Models/Board";
import { Unit } from "@Models/Entities/Unit";
import { getReactionDescription } from "@Systems/Chara/CharaTooltip";
import { increasePower } from "../../../../TriggerSystem/effects";
import * as TriggerSystem from "../../../../TriggerSystem/TriggerSystem";
import { pickOne } from "../../../../utils";
import { hexToVector3 } from "../../../../Utils/colorUtils";
import { scene } from "../../BattlegroundScene";
import * as sc from "./constants";
import * as ShopUI from "./ShopUI";


type OrbSpec = {
	id: string;
	name: string;
	color: number;
	tooltip: string;
	// return false to indicate the effect was not applied and the orb should return
	effect: (unit: Unit) => boolean
};

// 1 - reaction (gain power)
// 2 - boost
// 3 - transformation

const generateReactionOrb = () => {

	const reactionSourceEffects = ["shield", "heal", "haste", "damage", "slow", "regen", "poison"]

	const positions = [
		{
			power: 2,
			source: TriggerSystem.EFFECT_SOURCE_POSITIONS.column_allies
		},
		{
			power: 2,
			source: TriggerSystem.EFFECT_SOURCE_POSITIONS.row_allies
		},
		{
			power: 6,
			source: TriggerSystem.EFFECT_SOURCE_POSITIONS.left_ally
		},
		{
			power: 6,
			source: TriggerSystem.EFFECT_SOURCE_POSITIONS.right_ally
		},
		{
			power: 6,
			source: TriggerSystem.EFFECT_SOURCE_POSITIONS.top_ally
		},
		{
			power: 6,
			source: TriggerSystem.EFFECT_SOURCE_POSITIONS.bottom_ally
		},
	];

	const effect = pickOne(reactionSourceEffects)
	const position = pickOne(positions);
	const resulttingEffData = {
		"id": "increase_power",
		"amount": position.power,
		"targets": {
			"id": "self"
		}
	}

	const resultingEffect = {
		id: "reaction_orb",
		referencePower: 2,
		data: {
			effectId: effect,
			position: position.source as TriggerSystem.EffectSourcePosition,
			effects: [
				resulttingEffData
			]
		} as TriggerSystem.EffectReaction
	}

	return {
		id: "reaction_orb",
		name: "Reaction Orb: " + effect,
		color: 0xffcc00,
		tooltip: [`Adds ${getReactionDescription(resultingEffect.data, resultingEffect.referencePower)}.`,
			"A unit can have just one reaction (⚡)."
		].join("\n"),
		effect: (unit: Unit) => {
			return setReactionSafely(unit, {
				effectId: effect,
				position: position.source,
				effects: [
					{
						"id": "increase_power",
						"amount": position.power,
						"targets": {
							"id": "self"
						}
					}
				]
			});
		}
	}
}

const generateSkillPowerUpOrb = () => {

	const powerTargetEffects = ["heal", "damage", "shield", "regen", "poison"];

	const effectId = pickOne(powerTargetEffects);
	const amount = 10;

	return {
		id: "power_orb",
		name: `Power Orb: ${effectId}`,
		color: 0x00ff88,
		tooltip: [
			`[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]Increase Power[/color] [color=#ffd93d]+${amount}[/color]`,
			`[color=#c0c0c0]Target:[/color] [color=#e0e0e0]Units with '${effectId}' effect[/color]`,
			`[color=#c0c0c0]Condition:[/color] [color=#ffa94d]Unit must have effect '${effectId}'[/color]`,
		].join('\n'),
		effect: (unit: Unit) => {
			if (!unit.effects.some(e => e.id === effectId)) return false;
			increasePower([unit], amount);
			return true;
		}
	}

}

const generateChargeReactionOrb = () => {
	const reactionSourceEffects = ["shield", "heal", "haste", "damage", "slow", "regen", "poison"];

	const positions: Array<{ amount: number; source: TriggerSystem.EffectSourcePosition; }> = [
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
				amount: position.amount,
				targets: { id: "self" }
			}
		]
	};

	return {
		id: "charge_reaction_orb",
		name: `Charge Reaction Orb: ${effectId}`,
		color: 0xffe066,
		tooltip: [
			`Adds ${getReactionDescription(reactionData, position.amount)}.`,
			"A unit can have just one reaction (⚡)."
		].join("\n"),
		effect: (unit: Unit) => {
			return setReactionSafely(unit, reactionData);
		}
	};
}


// Orb effect functions (pure)
function crimsonOrbEffect(unit: Unit) {
	increasePower([unit], 5);
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
	return (totalEffects + totalReactions) < 3;
}

function canAddReaction(unit: Unit) {
	return unit.reactions.length < 1;
}

function setReactionSafely(unit: Unit, reaction: TriggerSystem.EffectReaction) {
	if (!canAddReaction(unit)) {
		console.log(`Cannot add reaction to ${unit.id}: reaction already present`);
		return false;
	}
	unit.reactions = [reaction];
	return true;
}

// Orb specs as plain data (lookup object)
const orbs: Record<string, () => {
	id: string;
	name: string;
	color: number;
	tooltip: string;
	effect: (unit: Unit) => boolean;
}> = {
	crimson_orb: () => ({
		id: "crimson_orb",
		name: "Crimson Orb",
		color: 0xff3333,
		tooltip: [
			"[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]Increase Power[/color] [color=#ffd93d]+5[/color]",
			"[color=#c0c0c0]Target:[/color] [color=#e0e0e0]Any unit[/color]",
		].join("\n"),
		effect: crimsonOrbEffect
	}),
	emerald_orb: generateSkillPowerUpOrb,
	azure_orb: () => ({
		id: "azure_orb",
		name: "Azure Orb",
		color: 0x3399ff,
		tooltip: "Reduce a unit's cooldown by 0.2s (minimum of 1s)",
		effect: (unit: Unit) => {
			unit.cooldown = Math.max(1000, unit.cooldown - 200);
			return true;
		}
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
		}
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
		name: `Power Orb: ${choice.label}`,
		color: 0x33ffaa,
		tooltip: [
			`[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]Increase Power[/color] [color=#ffd93d]+${choice.amount}[/color]`,
			`[color=#c0c0c0]Target:[/color] [color=#e0e0e0]${choice.label}[/color]`,
		].join("\n"),
		effect: (unit: Unit) => {
			return addEffectSafely(unit, {
				id: "increase_power",
				amount: choice.amount,
				targets: choice.target,
			});
		}
	}
}

// Increase X Power to some_position, but only if the unit has a randomized effect type (damage/heal/shield/regen/poison)
function generatePositionalSkillPowerOrb() {
	const skillTypes = ["heal", "damage", "shield", "regen", "poison"] as const;
	const effectId = pickOne([...skillTypes]);

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
		id: "positional_skill_power_orb",
		name: `Power Orb: ${choice.label} (if ${effectId})`,
		color: 0x44ffd1,
		tooltip: [
			`[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]Increase Power[/color] [color=#ffd93d]+${choice.amount}[/color]`,
			`[color=#c0c0c0]Target:[/color] [color=#e0e0e0]${choice.label}[/color]`,
			`[color=#c0c0c0]Condition:[/color] [color=#ffa94d]Unit must have effect '${effectId}'[/color]`,
		].join("\n"),
		effect: (unit: Unit) => {
			if (!((unit.effects || []).some(e => e.id === effectId))) return false;
			return addEffectSafely(unit, {
				id: "increase_power",
				amount: choice.amount,
				targets: choice.target,
			});
		}
	}
}

// Increase X Power to some_position only for units that HAVE a specific randomized effect type
function generatePositionalTypedPowerOrb() {
	const skillTypes = ["heal", "damage", "shield", "regen", "poison"] as const;
	const effectId = pickOne([...skillTypes]);

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
		id: "positional_typed_power_orb",
		name: `Power Orb: ${choice.label} (units with ${effectId})`,
		color: 0x22ccff,
		tooltip: [
			`[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]Increase Power[/color] [color=#ffd93d]+${choice.amount}[/color]`,
			`[color=#c0c0c0]Target:[/color] [color=#e0e0e0]${choice.label}[/color]`,
			`[color=#c0c0c0]Condition:[/color] [color=#ffa94d]Recipients must have '${effectId}'[/color]`,
		].join("\n"),
		effect: (unit: Unit) => {
			return addEffectSafely(unit, {
				id: "increase_power_on_type",
				amount: choice.amount,
				targets: choice.target,
				targetEffectId: effectId,
			} as any);
		}
	}
}


export function renderOrbs(ui: ShopUI.ShopUIState, orbIds: string[], onOrbUsed?: () => void | Promise<void>) {

	const orbY = sc.PANEL_Y + 550;
	const orbSpacing = 240;
	ui.orbContainer = scene.add.container(0, 0);

	const bg = scene.add.graphics()

	bg.fillStyle(0x000000, 0.25);
	bg.fillRoundedRect(
		ui.panelX + 20,
		orbY - 100,
		sc.TAVERN_BG_WIDTH,
		200,
		sc.SUB_PANEL_CORNER_RADIUS
	)

	ui.orbContainer.add(bg);

	function handleOrbDrop(params: {
		orb: MagicOrb,
		target: Phaser.GameObjects.GameObject,
		orbSpec: OrbSpec,
		magicOrb: MagicOrb
	}) {
		const { orb, target, orbSpec, magicOrb } = params;
		const playerBoard = Board.getBoardState();

		if (!playerBoard || !playerBoard.dropZones.includes(target as Phaser.GameObjects.Zone)) {
			console.log(`${orbSpec.name} dropped on non-board target:`, target);
			MagicOrbCallbacks.returnToPosition(orb, target);
			return;
		}

		// At this point target is guaranteed to be a Zone in dropZones
		const slotIndex = playerBoard.dropZones.indexOf(target as Phaser.GameObjects.Zone);
		const tileX = slotIndex % 3;
		const tileY = Math.floor(slotIndex / 3);

		console.log(`${orbSpec.name} dropped on board slot [${tileX}, ${tileY}] (index: ${slotIndex})`);

		const gameState = scene.state;
		const existingUnit = gameState?.gameData?.player?.units?.find((unit: Unit) => unit.position?.x === tileX && unit.position?.y === tileY);

		if (!existingUnit) {
			console.log(`No unit at position [${tileX}, ${tileY}] - orb returns to position`);
			MagicOrbCallbacks.returnToPosition(orb, target);
			return;
		}

		console.log(`Unit ${existingUnit.id} is at this position - applying ${orbSpec.name} effect!`);
		let applied = false;
		try {
			applied = !!orbSpec.effect(existingUnit);
		} catch (err) {
			console.error(`Error applying orb effect ${orbSpec.name} to ${existingUnit.id}:`, err);
			applied = false;
		}
		if (!applied) {
			console.log(`${orbSpec.name} effect returned false — returning orb to origin`);
			MagicOrbCallbacks.returnToPosition(orb, target);
			return;
		}
		magicOrb.startDissolve();
		onOrbUsed?.();
	}

	orbIds.forEach((orbId: string, index: number) => {
		const orbSpec = orbs[orbId]();
		if (!orbSpec) {
			console.warn(`Orb with id ${orbId} not found in orbs object`);
			return;
		}
		const orbX = ui.panelX + 220 + (index * orbSpacing);

		const magicOrb = new MagicOrb(scene, orbX, orbY, {
			size: 200,
			color: hexToVector3(orbSpec.color),
			intensity: 1.2,
			speed: 1.0,
			enableTooltip: true,
			enableDrag: true,
			returnDuration: 500,
			tooltipTitle: orbSpec.name,
			tooltipText: orbSpec.tooltip,
			onDropTarget: (orb: MagicOrb, target: Phaser.GameObjects.GameObject) => handleOrbDrop({ orb, target, orbSpec, magicOrb }),
			dropTargetNames: []
		});
		ui.orbContainer!.add(magicOrb.getShader());
		ui.magicOrbs.push(magicOrb);
		magicOrb.setDepth(1000);
	});

	scene.add.existing(ui.orbContainer!);
	ui.orbContainer!.setDepth(1000);
}