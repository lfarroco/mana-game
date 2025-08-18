import { MagicOrb, MagicOrbCallbacks } from "../../../../components/MagicOrb/MagicOrb";
import * as Phaser from "phaser";
import { getSharedPlayerBoard } from "../../../../Models/Board";
import { Unit } from "../../../../Models/Entities/Unit";
import { getReactionDescription } from "../../../../Systems/Chara/CharaTooltip";
import { increasePower } from "../../../../TriggerSystem/effects";
import { EffectReaction, EffectSourcePosition } from "../../../../TriggerSystem/TriggerSystem";
import { pickOne } from "../../../../utils";
import { hexToVector3 } from "../../../../Utils/colorUtils";
import { scene } from "../../BattlegroundScene";
import * as sc from "./ShopConstants";
import { ShopUI } from "./ShopUI";


type OrbSpec = {
	id: string;
	name: string;
	color: number;
	tooltip: string;
	effect: (unit: Unit) => void
};

// 1 - reaction (gain power)
// 2 - boost
// 3 - transformation

const generateReactionOrb = () => {

	const reactionSourceEffects = ["shield", "heal", "haste", "damage", "slow", "regen", "poison"]

	const positions = [
		// TODO: use imported constants
		{
			power: 2,
			source: "column_allies" as EffectSourcePosition
		},
		{
			power: 2,
			source: "row_allies" as EffectSourcePosition
		},
		{
			power: 6,
			source: "left" as EffectSourcePosition
		},
		{
			power: 6,
			source: "right" as EffectSourcePosition
		},
		{
			power: 6,
			source: "top" as EffectSourcePosition
		},
		{
			power: 6,
			source: "bottom" as EffectSourcePosition
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
			position: position.source as EffectSourcePosition,
			effects: [
				resulttingEffData
			]
		} as EffectReaction
	}

	return {
		id: "reaction_orb",
		name: "Reaction Orb: " + effect,
		color: 0xffcc00,
		tooltip: [`Adds ${getReactionDescription(resultingEffect.data, resultingEffect.referencePower)}.`,
			"A unit can have just one reaction (⚡)."
		].join("\n"),
		effect: (unit: Unit) => {
			if (unit.reactions.length > 0) return;
			unit.reactions = [
				{
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
				}
			]
		}
	}

}

// Orb effect functions (pure)
function crimsonOrbEffect(unit: Unit) {
	unit.power += 5;
	increasePower({
		targets: [unit],
		sourceUnit: unit,
		scene,
		amount: 5
	});
	console.log(`Crimson Orb applied to ${unit.id}, new power: ${unit.power}`);
}

function emeraldOrbEffect(unit: Unit) {
	if (!unit.effects.some(effect => effect.id === "heal")) return;
	increasePower({
		targets: [unit],
		sourceUnit: unit,
		scene,
		amount: 10
	});
}

// Orb specs as plain data (lookup object)
const orbs: Record<string, () => {
	id: string;
	name: string;
	color: number;
	tooltip: string;
	effect: (unit: Unit) => void;
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
	emerald_orb: () => ({
		id: "emerald_orb",
		name: "Emerald Orb",
		color: 0x00ff00,
		tooltip: [
			"[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]Increase Power[/color] [color=#ffd93d]+10[/color]",
			"[color=#c0c0c0]Target:[/color] [color=#e0e0e0]Healing units only[/color]",
			"[color=#c0c0c0]Condition:[/color] [color=#ffa94d]Unit must have heal ability[/color]",
		].join('\n'),
		effect: emeraldOrbEffect
	}),
	azure_orb: () => ({
		id: "azure_orb",
		name: "Azure Orb",
		color: 0x3399ff,
		tooltip: "Reduce a unit's cooldown by 0.2s (minimum of 1s)",
		effect: (unit: Unit) => {
			unit.cooldown = Math.max(1000, unit.cooldown - 200);
		}
	}),
	golden_orb: generateReactionOrb,
	violet_orb: () => ({
		id: "violet_orb",
		name: "Violet Orb",
		color: 0x9933ff,
		tooltip: "Makes a unit forget its reaction",
		effect: (unit: Unit) => {
			unit.reactions = []
		}
	})
};


export function renderOrbs(ui: ShopUI, orbIds: string[]) {

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
		ui: ShopUI,
		magicOrb: MagicOrb
	}) {
		const { orb, target, orbSpec, magicOrb } = params;
		const playerBoard = getSharedPlayerBoard();

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
		orbSpec.effect(existingUnit);
		magicOrb.startDissolve();
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
			onDropTarget: (orb: MagicOrb, target: Phaser.GameObjects.GameObject) => handleOrbDrop({ orb, target, orbSpec, ui, magicOrb }),
			dropTargetNames: []
		});
		ui.orbContainer!.add(magicOrb.getShader());
		ui.magicOrbs.push(magicOrb);
		magicOrb.setDepth(1000);
	});

	scene.add.existing(ui.orbContainer!);
	ui.orbContainer!.setDepth(1000);
}