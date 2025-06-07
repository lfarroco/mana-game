import { BattlegroundScene } from "../BattlegroundScene";
import { RelicCard } from "./RelicCard"; // For constants
import { images } from "../../../assets";

// Constants for Relic Slot layout and appearance
// These could also be moved to a more general UI constants file if shared
const RELIC_SLOT_START_X = 200;
const RELIC_SLOT_START_Y = 700;
const RELIC_SLOT_SIZE = 200;
const RELIC_SLOT_SPACING = 0; // If slots are directly adjacent based on current math

const RELIC_SLOT_VISUAL_BORDER_COLOR = 0xffff00;
const RELIC_SLOT_VISUAL_BORDER_THICKNESS = 2;
const RELIC_SLOT_VISUAL_FILL_COLOR = 0x00ffff;
const RELIC_SLOT_VISUAL_FILL_ALPHA = 0.3;

/**
 * Creates the visual and interactive relic slots on the game board.
 * @param scene The BattlegroundScene instance.
 */
export function setupRelicSlots(scene: BattlegroundScene): void {
	RelicCard.RELIC_SLOT_GRID_POSITIONS.forEach(([gridX, gridY]) => {
		const xPos = RELIC_SLOT_START_X + gridX * (RELIC_SLOT_SIZE + RELIC_SLOT_SPACING);
		const yPos = RELIC_SLOT_START_Y + gridY * (RELIC_SLOT_SIZE + RELIC_SLOT_SPACING);
		const width = RELIC_SLOT_SIZE;
		const height = RELIC_SLOT_SIZE;

		// Create the drop zone
		const zone = scene.add.zone(xPos, yPos, width, height);
		zone.setOrigin(0.5);
		zone.setName(`${RelicCard.SLOT_NAME_PREFIX}${gridX}-${gridY}`);
		zone.setRectangleDropZone(width, height);

		// Create the visual representation (border and fill)
		const dropZoneDisplay = scene.add.graphics();
		dropZoneDisplay.lineStyle(RELIC_SLOT_VISUAL_BORDER_THICKNESS, RELIC_SLOT_VISUAL_BORDER_COLOR);
		dropZoneDisplay.fillStyle(RELIC_SLOT_VISUAL_FILL_COLOR, RELIC_SLOT_VISUAL_FILL_ALPHA);
		dropZoneDisplay.fillRect(
			xPos - width / 2, yPos - height / 2,
			width, height
		);
		dropZoneDisplay.strokeRect(
			xPos - width / 2, yPos - height / 2,
			width, height
		);

		// Add the background slot image
		scene.add.image(xPos, yPos, images.slot.key).setOrigin(0.5);

		// Add visuals to a container if needed, or directly to the scene
	});
}