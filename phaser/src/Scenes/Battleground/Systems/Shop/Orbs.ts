import { MagicOrb, MagicOrbCallbacks } from "../../../../components/MagicOrb/MagicOrb";
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
		tooltip: "A sphere of concentrated magical energy pulsing with arcane power.",
		effect: crimsonOrbEffect
	},
	emerald_orb: {
		id: "emerald_orb",
		name: "Emerald Orb",
		color: 0x00ff00,
		tooltip: "Increase a healing unit power by 10",
		effect: emeraldOrbEffect
	},
	azure_orb: {
		id: "azure_orb",
		name: "Azure Orb",
		color: 0x3399ff,
		tooltip: "A mysterious orb radiating cool blue energy.",
		effect: (unit: Unit) => {
			// Dummy effect
			console.log(`Azure Orb used on ${unit.id}`);
		}
	},
	golden_orb: {
		id: "golden_orb",
		name: "Golden Orb",
		color: 0xffcc00,
		tooltip: "A radiant orb shimmering with golden light.",
		effect: (unit: Unit) => {
			// Dummy effect
			console.log(`Golden Orb used on ${unit.id}`);
		}
	},
	violet_orb: {
		id: "violet_orb",
		name: "Violet Orb",
		color: 0x9933ff,
		tooltip: "A swirling orb of deep violet energy.",
		effect: (unit: Unit) => {
			// Dummy effect
			console.log(`Violet Orb used on ${unit.id}`);
		}
	}
};


export function renderOrbs(ui: ShopUI, orbIds: string[]) {
	const orbY = sc.PANEL_Y + 520;
	const orbSpacing = 240;
	ui.orbContainer = ui.scene.add.container(0, 0);

	const orbNames = ['Crimson', 'Emerald', 'Azure', 'Golden', 'Violet'];
	const getOrbName = (index: number) => orbNames[index] || 'Mystical';

	function handleOrbDrop({ orb, target, orbSpec, orbName, ui, magicOrb }: {
		orb: any,
		target: any,
		orbSpec: { id: string; name: string; color: number; tooltip: string; effect: (unit: Unit, scene: any) => void },
		orbName: string,
		ui: ShopUI,
		magicOrb: any
	}) {
		const Board = require("../../../../Models/Board");
		const playerBoard = Board.getSharedPlayerBoard();

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
		const existingUnit = gameState?.gameData?.player?.units?.find((unit: any) => unit.position?.x === tileX && unit.position?.y === tileY);

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
		const orbX = ui.panelX + 120 + (index * orbSpacing);
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