import { playerForce, updatePlayerGoldIO } from "../../../Models/Force";
import { getState } from "../../../Models/State";
import { tween } from "../../../Utils/animation";
import { images } from "../../../assets";
import { RelicDefinition } from "../../../Models/Card";
import * as Traits from "../../../Models/Traits";
import { Vec2 } from "../../../Models/Geometry";
import { GameEvents } from "../../../constants/events";
import { UserMessagePayload } from "../../../Models/EventPayloads";
import BattlegroundScene from "../BattlegroundScene";

export type Relic = {
	id: string;
	pic: string;
	forceId: string;
	traits: Traits.TraitData[];
	position: Vec2;
};

export class RelicCard extends Phaser.GameObjects.Image {
	// Constants for game rules and UI identifiers
	static readonly RELIC_COST = 6;
	static readonly MAX_RELICS = 4;
	// Defines the grid positions for relics
	static readonly RELIC_SLOT_GRID_POSITIONS = [
		[0, 0], [0, 1],
		[1, 0], [1, 1],
	];
	static readonly SLOT_NAME_PREFIX = "slot-";

	id: string;
	owned: boolean = false;
	private wasDroppedOnZone = false;
	private wasDragged = false;

	constructor(
		public parent: BattlegroundScene,
		public initialX: number, // Renamed baseX to initialX for clarity
		public initialY: number, // Renamed baseY to initialY for clarity
		public forceId: string,
		public relicData: RelicDefinition,
		public iconSize: number,
		public onAcquire: () => void
	) {
		super(parent, initialX, initialY, relicData.pic);
		this.setDisplaySize(iconSize, iconSize);
		parent.add.existing(this);
		// Note: if this object is added to another container later (e.g., a Flyout),
		this.setInteractive({ draggable: true });

		this.on("drag", (p: Pointer) => {
			this.x = p.x;
			this.y = p.y;

			this.wasDragged = true;
		});

		this.on("dragstart", this.handleDragStart);
		this.on("drop", this.handleDrop);
		this.on("dragend", this.handleDragEnd);

		this.on("pointerup", this.handlePointerUp)
		this.on("pointerover", this.handlePointerOver);
		this.on("pointerout", this.handlePointerOut);

		this.id = this.relicData.id; // Use definition ID or uuid.v4() if instances need unique IDs from shop
		this.setName(this.id);
	}



	// Checks if the player can afford the relic
	private canAfford(): boolean {
		return getState().gameData.player.gold >= RelicCard.RELIC_COST;
	}

	// Checks if the player has space for a new relic
	private hasSpaceForNewRelic(): boolean {
		return getState().gameData.player.relics.length < RelicCard.MAX_RELICS;
	}

	// Handles the actual acquisition process once checks are passed
	private completeAcquisition(gridX: number, gridY: number): void {
		if (!this.owned) { // Ensure this is only done once for a new relic
			this.onAcquire(); // Callback (e.g., to refresh shop)
			this.owned = true;
		}

		// Assume this.x and this.y are already set to the target visual position
		this.initialX = this.x; // Update initialX/Y to the new base position
		this.initialY = this.y;

		const relicData: Relic = {
			id: this.id,
			forceId: this.forceId,
			pic: this.relicData.pic,
			position: { x: gridX, y: gridY } as Vec2, // Ensure type compatibility
			traits: this.relicData.traits
		};
		playerForce.relics.push(relicData);
	}

	private attemptPurchaseAndPlace(gridX: number, gridY: number, targetVisualX: number, targetVisualY: number): boolean {
		if (this.owned) { // Should not be called if already owned
			console.error("Attempted to purchase an already owned relic.");
			return false;
		}

		if (!this.canAfford()) {
			this.parent.events.emit(GameEvents.USER_MESSAGE_REQUESTED, {
				text: `Not enough gold (cost: ${RelicCard.RELIC_COST})`,
				type: 'error'
			} as UserMessagePayload);
			return false;
		}
		if (!this.hasSpaceForNewRelic()) {
			this.parent.events.emit(GameEvents.USER_MESSAGE_REQUESTED, {
				text: "No room for a new relic",
				type: 'error'
			} as UserMessagePayload);
			return false;
		}

		updatePlayerGoldIO(this.parent, -RelicCard.RELIC_COST);

		// Set visual position before completing acquisition
		this.x = targetVisualX;
		this.y = targetVisualY;

		this.completeAcquisition(gridX, gridY);
		return true;
	}

	handlePointerUp = () => {
		if (this.wasDragged) {
			this.wasDragged = false;
			return;
		}
		// If it's a click on an already owned relic, do nothing (or implement other behavior e.g. show info)
		if (this.owned) {
			return;
		}

		// Find an empty grid position for the new relic
		const emptySlotGridPosition = RelicCard.RELIC_SLOT_GRID_POSITIONS.find(([x, y]) =>
			!getState().gameData.player.relics
				.some(r => {
					return r.position.x === x && r.position.y === y
				}));

		if (!emptySlotGridPosition) {
			// This should ideally be caught by hasSpaceForNewRelic, but as a fallback:
			this.parent.events.emit(GameEvents.USER_MESSAGE_REQUESTED, {
				text: "No empty slot available on board.",
				type: 'error'
			} as UserMessagePayload);
			return;
		}

		const [slotGridX, slotGridY] = emptySlotGridPosition;
		const targetSlotGameObject = this.parent.children.getByName(`${RelicCard.SLOT_NAME_PREFIX}${slotGridX}-${slotGridY}`) as Phaser.GameObjects.Image | undefined;

		if (!targetSlotGameObject) {
			console.error(`Slot GameObject ${RelicCard.SLOT_NAME_PREFIX}${slotGridX}-${slotGridY} not found!`);
			this.parent.events.emit(GameEvents.USER_MESSAGE_REQUESTED, {
				text: "Error placing relic.",
				type: 'error'
			} as UserMessagePayload);
			return;
		}

		if (this.attemptPurchaseAndPlace(slotGridX, slotGridY, targetSlotGameObject.x, targetSlotGameObject.y)) {
			// Purchase successful, card is now at targetSlotGameObject's position via attemptPurchaseAndPlace.
			this.tweenToSlot(targetSlotGameObject.x, targetSlotGameObject.y);
		}
		// If attemptPurchaseAndPlace fails, an error is displayed, and the card remains in the shop.
	}

	handleDrop = (_p: Pointer, zone: Phaser.GameObjects.Zone) => {

		this.wasDroppedOnZone = true;

		if (zone?.name?.startsWith(RelicCard.SLOT_NAME_PREFIX)) {
			this.handleDropRelicIntoSlot(zone);
		} else {
			// Dropped on something that isn't a relic slot
			this.tweenToSlot();
		}
	};

	handleDragEnd = () => {
		if (!this.wasDragged) return;
		if (this.wasDroppedOnZone) {
			this.wasDroppedOnZone = false; // Reset for next drag
			return;
		}

		this.tweenToSlot();
		this.wasDroppedOnZone = false;
	};

	private handleDragStart = () => {
		this.wasDroppedOnZone = false;
		this.parent.events.emit(GameEvents.TOOLTIP_HIDE);

		// Bring to top within its current rendering context
		if (this.parentContainer) { // If the relic is in a Phaser.GameObjects.Container (e.g., the shop flyout)
			this.parentContainer.bringToTop(this);
		} else { // If the relic is a direct child of the scene's display list
			this.parent.children.bringToTop(this);
		}
	}

	private handleDropRelicIntoSlot(zone: Phaser.GameObjects.Zone) {

		const [_, xStr, yStr] = zone.name.split("-");
		const targetGridX = parseInt(xStr);
		const targetGridY = parseInt(yStr);

		const occupierData = getState().gameData.player
			.relics
			.find(r => r.position.x === targetGridX && r.position.y === targetGridY);

		if (occupierData) { // Slot is occupied
			if (!this.owned) { // Trying to buy and place on an occupied slot
				this.parent.events.emit(GameEvents.USER_MESSAGE_REQUESTED, {
					text: "This slot is already occupied!",
					type: 'error'
				} as UserMessagePayload);
				this.tweenToSlot(); // Back to shop
			} else { // Moving an owned relic to an occupied slot (SWAP)
				const occupierIcon = this.parent.children.list.find(
					(child) => child.name === occupierData.id
				) as RelicCard | undefined;

				if (!occupierIcon) {
					console.error(`Occupier RelicCard with id ${occupierData.id} not found in scene.`);
					this.tweenToSlot(); // Revert drag
					return;
				}

				const draggedRelicData = getState().gameData.player.relics.find(r => r.id === this.id);
				if (!draggedRelicData) {
					console.error(`Dragged RelicCard data with id ${this.id} not found.`);
					this.tweenToSlot();
					return;
				}

				// Visual positions for tweening
				const draggedRelicOriginalVisualX = this.initialX; // Dragged relic's current slot X (visual)
				const draggedRelicOriginalVisualY = this.initialY; // Dragged relic's current slot Y (visual)

				// Grid positions
				const draggedRelicOriginalGridX = draggedRelicData.position.x;
				const draggedRelicOriginalGridY = draggedRelicData.position.y;

				// Tween occupier to the dragged relic's original slot (visual position)
				occupierIcon.tweenToSlot(draggedRelicOriginalVisualX, draggedRelicOriginalVisualY);
				// Tween dragged relic to the target (occupier's original) slot (visual position)
				this.tweenToSlot(zone.x, zone.y); // zone.x, zone.y is the target visual slot

				// Update data model positions
				occupierIcon.updateDataPosition(draggedRelicOriginalGridX, draggedRelicOriginalGridY);
				this.updateDataPosition(targetGridX, targetGridY);
			}
		} else { // Slot is empty
			if (this.owned) { // Moving an owned relic to an empty slot
				this.tweenToSlot(zone.x, zone.y); // Visually move and update initialX/Y
				this.updateDataPosition(targetGridX, targetGridY);
			} else { // Buying a new relic by dragging to an empty slot
				if (this.attemptPurchaseAndPlace(targetGridX, targetGridY, zone.x, zone.y)) {
					// Purchase successful. Card is already at zone.x, zone.y via attemptPurchaseAndPlace.
					// baseX/Y are also updated in completeAcquisition.
					// No further tween needed here as it's already at the drop location.
				} else {
					// Purchase failed (e.g., not enough gold)
					this.tweenToSlot(); // Return to shop position
				}
			}
		}
	}

	private async tweenToSlot(x: number = this.initialX, y: number = this.initialY) {
		await tween({
			targets: [this],
			x,
			y,
		});
		this.initialX = x; // Update the base position after tweening
		this.initialY = y;
	}

	updateDataPosition(x: number, y: number) {
		const record = getState().gameData.player.relics.find(r => r.id === this.id);

		if (!record) {
			console.error(`Relic data not found for ID ${this.id} during position update.`);
			return;
		}

		record.position.x = x;
		record.position.y = y;
	}

	private handlePointerOver(_pointer: Pointer) {

		const tooltipX = this.x + (this.displayWidth / 2) + 300;
		this.parent.events.emit(GameEvents.TOOLTIP_SHOW, {
			x: tooltipX,
			y: this.y,
			title: this.relicData.name,
			description: this.relicData.description
		});
	}

	private handlePointerOut() {
		this.parent.events.emit(GameEvents.TOOLTIP_HIDE);
	}

	// Ensure to call cleanupListeners() if a relic is removed or the scene is destroyed.
}
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
