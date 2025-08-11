import { MagicOrb, MagicOrbCallbacks } from "../../../../components/MagicOrb/MagicOrb";
import { Unit } from "../../../../Models/Entities/Unit";
import { increasePower } from "../../../../TriggerSystem/effects";
import { hexToVector3 } from "../../../../Utils/colorUtils";
import { scene } from "../../BattlegroundScene";
import * as sc from "./ShopConstants";
import { ShopUI } from "./ShopUI";

type Orb = {
	id: string;
	name: string;
	color: number;
	tooltip: string;
	onDropTarget: (unit: Unit) => void;
}
//  "crimson_orb",
// 			"emerald_orb",
// 			"azure_orb",
// 			"golden_orb",
// 			"violet_orb",
// 			"void_orb",

const orbs: Orb[] = [
	{
		id: "crimson_orb",
		name: "Crimson Orb",
		color: 0xff3333,
		tooltip: "A sphere of concentrated magical energy pulsing with arcane power.",
		onDropTarget: (unit) => {
			unit.power += 5; // Example effect
			increasePower({
				targets: [unit],
				sourceUnit: unit,
				scene,
				amount: 5
			})
			console.log(`Crimson Orb applied to ${unit.id}, new power: ${unit.power}`);
		}
	},
	{
		id: "emerald_orb",
		name: "Emerald Orb",
		color: 0x00ff00,
		tooltip: "Increase a healing unit power by 10",
		onDropTarget: (unit) => {
			if (!unit.effects.some(effect => effect.id === "heal")) return;
			increasePower({
				targets: [unit],
				sourceUnit: unit,
				scene,
				amount: 10

			})
		}
	},
	// Add other orbs similarly...
];

export function renderOrbs(ui: ShopUI, orbIds: string[]) {
	const orbY = sc.PANEL_Y + 520;
	const orbSpacing = 240;
	ui.orbContainer = ui.scene.add.container(0, 0);

	orbIds.forEach((orbId, index) => {
		const orbX = ui.panelX + 120 + (index * orbSpacing);

		const orbSpec = orbs.find(o => o.id === orbId);
		if (!orbSpec) {
			console.warn(`Orb with id ${orbId} not found in orbs array`);
			return;
		}

		// Create tooltip content based on orb color
		const orbNames = ['Crimson', 'Emerald', 'Azure', 'Golden', 'Violet'];
		const orbName = orbNames[index] || `Mystical`;

		const magicOrb = new MagicOrb(ui.scene, orbX, orbY, {
			size: 200,
			color: hexToVector3(orbSpec.color), // Using hex format
			intensity: 1.2,
			speed: 1.0,
			enableTooltip: true,
			enableDrag: true, // Enable drag functionality
			returnDuration: 500, // Smooth return animation
			tooltipTitle: orbSpec.name,
			tooltipText: orbSpec.tooltip,
			// Drop callback - determines what happens when orb is dropped on a target
			onDropTarget: (orb, target) => {
				// Get board information if dropped on a board slot
				const Board = require("../../../../Models/Board");
				const playerBoard = Board.getSharedPlayerBoard();

				if (!playerBoard || !playerBoard.dropZones.includes(target)) {
					console.log(`${orbName} Orb dropped on non-board target:`, target.name || target.getData?.('type') || 'unknown');
					// For non-board targets, use simple return behavior
					MagicOrbCallbacks.returnToPosition(orb, target);
					return;
				}

				const slotIndex = playerBoard.dropZones.indexOf(target);
				const tileX = slotIndex % 3;
				const tileY = Math.floor(slotIndex / 3);

				console.log(`${orbName} Orb dropped on board slot [${tileX}, ${tileY}] (index: ${slotIndex})`);

				// Check if the slot is occupied
				// Access game state to check if there's a unit at this position
				const gameState = ui.scene.state;
				const existingUnit = gameState?.gameData?.player?.units?.find((unit: any) => unit.position?.x === tileX && unit.position?.y === tileY
				);

				if (!existingUnit) {
					console.log(`No unit at position [${tileX}, ${tileY}] - orb returns to position`);
					MagicOrbCallbacks.returnToPosition(orb, target);
					return;
				}

				console.log(`Unit ${existingUnit.id} is at this position - applying ${orbName} effect!`);

				orbSpec.onDropTarget(existingUnit);

				magicOrb.startDissolve();

			},
			// Note: Board drop zones are automatically detected
			// dropTargetNames can be used for additional custom targets if needed
			dropTargetNames: [] // Empty array - we detect board zones automatically
		});

		// Add the orb's shader to the container
		ui.orbContainer!.add(magicOrb.getShader());
		ui.magicOrbs.push(magicOrb); // Store orb for updates


		// Set high depth so orbs appear above board units
		magicOrb.setDepth(1000);
	});

	// Add orb container directly to scene instead of flyout so orbs stay above dragged units
	ui.scene.add.existing(ui.orbContainer!);
	ui.orbContainer!.setDepth(1000);
}