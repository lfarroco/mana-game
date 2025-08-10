import { MagicOrb, MagicOrbCallbacks } from "../../../../components/MagicOrb/MagicOrb";
import { increasePower } from "../../../../TriggerSystem/effects";
import { hexToVector3 } from "../../../../Utils/colorUtils";
import * as sc from "./ShopConstants";
import { ShopUI } from "./ShopUI";


export function renderOrbs(ui: ShopUI, orbs: string[]) {
	const orbY = sc.PANEL_Y + 520;
	const orbSpacing = 240;
	ui.orbContainer = ui.scene.add.container(0, 0);

	orbs.forEach((orb, index) => {
		const orbX = ui.panelX + 120 + (index * orbSpacing);

		const colors = {
			["crimson_orb"]: 0xff0000,
			["emerald_orb"]: 0x00ff00,
			["azure_orb"]: 0x0000ff,
			["golden_orb"]: 0xffff00,
			["violet_orb"]: 0xff00ff,
			["void_orb"]: 0x000000
		} as Record<string, number>;
		const color = colors[orb] || 0xffffff; // Default to white if not found
		// Create tooltip content based on orb color
		const orbNames = ['Crimson', 'Emerald', 'Azure', 'Golden', 'Violet'];
		const orbName = orbNames[index] || `Mystical`;

		const magicOrb = new MagicOrb(ui.scene, orbX, orbY, {
			size: 200,
			color: hexToVector3(color), // Using hex format
			intensity: 1.2,
			speed: 1.0,
			enableTooltip: true,
			enableDrag: true, // Enable drag functionality
			returnDuration: 500, // Smooth return animation
			tooltipTitle: `${orbName} Orb`,
			tooltipText: `A sphere of concentrated magical energy pulsing with arcane power.\n\nColor Code: #${color.toString(16).toUpperCase().padStart(6, '0')}\nEnergy Level: High\nStability: Stable`,
			// Drop callback - determines what happens when orb is dropped on a target
			onDropTarget: (orb, target) => {
				// Get board information if dropped on a board slot
				const Board = require("../../../../Models/Board");
				const playerBoard = Board.getSharedPlayerBoard();

				if (playerBoard && playerBoard.dropZones.includes(target)) {
					const slotIndex = playerBoard.dropZones.indexOf(target);
					const tileX = slotIndex % 3;
					const tileY = Math.floor(slotIndex / 3);

					console.log(`${orbName} Orb dropped on board slot [${tileX}, ${tileY}] (index: ${slotIndex})`);

					// Check if the slot is occupied
					// Access game state to check if there's a unit at this position
					const gameState = ui.scene.state;
					const existingUnit = gameState?.gameData?.player?.units?.find((unit: any) => unit.position?.x === tileX && unit.position?.y === tileY
					);

					if (existingUnit) {
						console.log(`Unit ${existingUnit.id} is at this position - applying ${orbName} effect!`);

						existingUnit.power += 5; // Example effect: increase power by 5
						increasePower({
							targets: [existingUnit],
							amount: 5,
							sourceUnit: existingUnit,
							scene: ui.scene
						});
						magicOrb.startDissolve();

					} else {
						console.log(`No unit at position [${tileX}, ${tileY}] - orb returns to position`);
						MagicOrbCallbacks.returnToPosition(orb, target);
					}
				} else {
					console.log(`${orbName} Orb dropped on non-board target:`, target.name || target.getData?.('type') || 'unknown');
					// For non-board targets, use simple return behavior
					MagicOrbCallbacks.returnToPosition(orb, target);
				}
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