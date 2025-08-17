import { MagicOrb, MagicOrbCallbacks } from "../../../../components/MagicOrb/MagicOrb";
import { getSharedPlayerBoard } from "../../../../Models/Board";
import { Unit } from "../../../../Models/Entities/Unit";
import { increasePower } from "../../../../TriggerSystem/effects";
import { hexToVector3 } from "../../../../Utils/colorUtils";

import * as sc from "./ShopConstants";
import { ShopUI } from "./ShopUI";

// Orb effect functions (pure)
function crimsonOrbEffect(unit: Unit, scene: any) {
	unit.power += 5;
	increasePower({
		targets: [unit],
		sourceUnit: unit,
		scene,
		amount: 5
	});
	console.log(`Crimson Orb applied to ${unit.id}, new power: ${unit.power}`);
}

function emeraldOrbEffect(unit: Unit, scene: any) {
	if (!unit.effects.some(effect => effect.id === "heal")) return;
	increasePower({
		targets: [unit],
		sourceUnit: unit,
		scene,
		amount: 10
	});
}

// Orb specs as plain data (lookup object)
const orbs: Record<string, {
	id: string;
	name: string;
	color: number;
	tooltip: string;
	effect: (unit: Unit, scene: any) => void;
}> = {
	crimson_orb: {
		id: "crimson_orb",
		name: "Crimson Orb",
		color: 0xff3333,
		tooltip: "[color=#ff6b6b]Power Enhancement[/color]\n\n[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]Increase Power[/color] [color=#ffd93d]+5[/color]\n[color=#c0c0c0]Target:[/color] [color=#e0e0e0]Any unit[/color]\n\n[color=#c0c0c0]Drag and drop onto a unit to permanently increase their power. A sphere of concentrated magical energy pulsing with arcane power.[/color]",
		effect: crimsonOrbEffect
	},
	emerald_orb: {
		id: "emerald_orb",
		name: "Emerald Orb",
		color: 0x00ff00,
		tooltip: "[color=#51cf66]Healing Enhancement[/color]\n\n[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]Increase Power[/color] [color=#ffd93d]+10[/color]\n[color=#c0c0c0]Target:[/color] [color=#e0e0e0]Healing units only[/color]\n[color=#c0c0c0]Condition:[/color] [color=#ffa94d]Unit must have heal ability[/color]\n\n[color=#c0c0c0]Drag and drop onto a healing unit to enhance their restorative powers. The emerald energy resonates with life magic.[/color]",
		effect: emeraldOrbEffect
	},
	azure_orb: {
		id: "azure_orb",
		name: "Azure Orb",
		color: 0x3399ff,
		tooltip: "Reduce a unit's cooldown by 0.2s (minimum of 1s)",
		effect: (unit: Unit) => {
			unit.cooldown = Math.max(1000, unit.cooldown - 200);
		}
	},
	golden_orb: {
		id: "golden_orb",
		name: "Golden Orb",
		color: 0xffcc00,
		tooltip: "Adds 'when an ally shields, gain 2 power'.\nIf the unit already has this effect, increase it by 2.",
		effect: (unit: Unit) => {
			const existingRection = unit.reactions
				.find(react => {
					return react.effectId === "shield" && react.position === "column_allies" && react.effects.some(e => e.id === "increase_power" && e.targets.id === "self");
				});

			if (existingRection) {
				//increase by 2
				const effect = existingRection.effects
					.find(e => e.id === "increase_power" && e.targets.id === "self");
				//@ts-ignore
				effect.amount += 2;
				return;
			}

			unit.reactions = [
				...unit.reactions,
				{
					effectId: "shield",
					position: "allies",
					effects: [
						{
							"id": "increase_power",
							"sourceId": unit.id,
							"amount": 2,
							"targets": {
								"id": "self"
							}
						}
					]
				}
			]
		}
	},
	violet_orb: {
		id: "violet_orb",
		name: "Violet Orb",
		color: 0x9933ff,
		tooltip: "[color=#da77f2]Arcane Mystery[/color]\n\n[color=#c0c0c0]Effect:[/color] [color=#da77f2]Unknown[/color]\n[color=#c0c0c0]Target:[/color] [color=#e0e0e0]Any unit[/color]\n\n[color=#c0c0c0]A swirling orb of deep violet energy. Ancient magic flows within, its secrets hidden from mortal understanding.[/color]",
		effect: (unit: Unit) => {
			// Dummy effect
			console.log(`Violet Orb used on ${unit.id}`);
		}
	}
};


export function renderOrbs(ui: ShopUI, orbIds: string[]) {

	const orbY = sc.PANEL_Y + 550;
	const orbSpacing = 240;
	ui.orbContainer = ui.scene.add.container(0, 0);

	const bg = ui.scene.add.graphics()

	bg.fillStyle(0x000000, 0.25);
	bg.fillRoundedRect(
		ui.panelX + 20,
		orbY - 100,
		sc.TAVERN_BG_WIDTH,
		200,
		sc.SUB_PANEL_CORNER_RADIUS
	)

	ui.orbContainer.add(bg);

	const orbNames = ['Crimson', 'Emerald', 'Azure', 'Golden', 'Violet'];
	const getOrbName = (index: number) => orbNames[index] || 'Mystical';

	function handleOrbDrop(params: {
		orb: any,
		target: any,
		orbSpec: { id: string; name: string; color: number; tooltip: string; effect: (unit: Unit, scene: any) => void },
		orbName: string,
		ui: ShopUI,
		magicOrb: any
	}) {
		const { orb, target, orbSpec, orbName, ui, magicOrb } = params;
		const playerBoard = getSharedPlayerBoard();

		if (!playerBoard || !playerBoard.dropZones.includes(target)) {
			console.log(`${orbName} Orb dropped on non-board target:`, target.name || target.getData?.('type') || 'unknown');
			MagicOrbCallbacks.returnToPosition(orb, target);
			return;
		}

		const slotIndex = playerBoard.dropZones.indexOf(target);
		const tileX = slotIndex % 3;
		const tileY = Math.floor(slotIndex / 3);

		console.log(`${orbName} Orb dropped on board slot [${tileX}, ${tileY}] (index: ${slotIndex})`);

		const gameState = ui.scene.state;
		const existingUnit = gameState?.gameData?.player?.units?.find((unit: Unit) => unit.position?.x === tileX && unit.position?.y === tileY);

		if (!existingUnit) {
			console.log(`No unit at position [${tileX}, ${tileY}] - orb returns to position`);
			MagicOrbCallbacks.returnToPosition(orb, target);
			return;
		}

		console.log(`Unit ${existingUnit.id} is at this position - applying ${orbName} effect!`);
		orbSpec.effect(existingUnit, ui.scene);
		magicOrb.startDissolve();
	}

	orbIds.forEach((orbId: string, index: number) => {
		const orbSpec = orbs[orbId];
		if (!orbSpec) {
			console.warn(`Orb with id ${orbId} not found in orbs object`);
			return;
		}
		const orbX = ui.panelX + 220 + (index * orbSpacing);
		const orbName = getOrbName(index);

		const magicOrb = new MagicOrb(ui.scene, orbX, orbY, {
			size: 200,
			color: hexToVector3(orbSpec.color),
			intensity: 1.2,
			speed: 1.0,
			enableTooltip: true,
			enableDrag: true,
			returnDuration: 500,
			tooltipTitle: orbSpec.name,
			tooltipText: orbSpec.tooltip,
			onDropTarget: (orb: any, target: any) => handleOrbDrop({ orb, target, orbSpec, orbName, ui, magicOrb }),
			dropTargetNames: []
		});
		ui.orbContainer!.add(magicOrb.getShader());
		ui.magicOrbs.push(magicOrb);
		magicOrb.setDepth(1000);
	});

	ui.scene.add.existing(ui.orbContainer!);
	ui.orbContainer!.setDepth(1000);
}