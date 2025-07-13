import Phaser from "phaser";
import { Chara } from "./Chara";
import { FORCE_ID_PLAYER } from "../../constants/constants";
import * as constants from "../../constants/constants";
import { tween } from "../../Utils/animation";
import { GameEvents } from "../../constants/events";
import { Vec2 } from "../../Models/Geometry";
import * as Board from "../../Models/Board";
import { vec2 } from "../../Models/Geometry";
import * as sc from "../../Scenes/Battleground/Systems/Shop/ShopConstants";

export class CharaInputHandler {
	dragStartX: number = 0;
	dragStartY: number = 0;
	wasDragSuccessful: boolean = false;
	chara: Chara;

	constructor(chara: Chara) {
		this.chara = chara;
		this.setupInteractions();
	}

	setupInteractions(): void {
		// Chara's constructor should have already called setInteractive.
		// This handler attaches the listeners.

		if (this.chara.unit.force === FORCE_ID_PLAYER || this.chara.getIsShopItem()) {
			this.chara.scene.input.setDraggable(this.chara, true); // Pass `true` to use top-level input manager for drag events

			this.chara.on(Phaser.Input.Events.DRAG_START, this.onDragStart);
			this.chara.on(Phaser.Input.Events.DRAG, this.onDrag);
			// Note: 'drop' is emitted on the draggable when it's dropped on a valid zone.
			this.chara.on(Phaser.Input.Events.DROP, this.onDrop);
			this.chara.on(Phaser.Input.Events.DRAG_END, this.onDragEnd);
		}

		if (this.chara.getIsShopItem()) {
			// Ensure this doesn't conflict if DRAG_END also fires on pointer up after a drag.
			// The click check (pointer.getDistance) should handle this.
			this.chara.on(Phaser.Input.Events.POINTER_UP, this.onPointerUpShopItem);
		}
	}

	onDragStart = (_pointer: Phaser.Input.Pointer, _dragX: number, _dragY: number): void => {
		this.dragStartX = this.chara.x;
		this.dragStartY = this.chara.y;
		this.wasDragSuccessful = false;

		this.chara.scene.children.bringToTop(this.chara);
		tween({
			targets: [this.chara],
			angle: -10,
			duration: 100,
			ease: "Cubic.Out",
		});
		if (!this.chara.getIsShopItem()) {
			this.chara.shop.shopUI.showSellZone();
		}
		this.chara.scene.events.emit(GameEvents.TOOLTIP_HIDE);
	}

	onDrag = (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void => {
		this.chara.x = dragX;
		this.chara.y = dragY;
		// Potentially emit an event if other systems need to react to dragging over areas
	}

	onDrop = (_pointer: Phaser.Input.Pointer, dropZoneTarget: Phaser.GameObjects.GameObject): void => {
		this.wasDragSuccessful = this.processDrop(dropZoneTarget, this.dragStartX, this.dragStartY);
	}

	onDragEnd = (_pointer: Phaser.Input.Pointer): void => {
		this.chara.scene.tweens.add({
			targets: [this.chara],
			angle: 0,
			duration: 100,
			ease: "Cubic.Out",
		});

		// Always hide the sell zone when a drag ends
		if (!this.chara.getIsShopItem()) {
			this.chara.shop.shopUI.hideSellZone();
		}
		if (!this.wasDragSuccessful) {
			this.chara.revertDragOrFailedPurchase(this.dragStartX, this.dragStartY);
		}
		// Reset for next potential drag, though wasDragSuccessful is set at start of drag.
		// this.wasDragSuccessful = false; // Not strictly needed here as it's reset on drag_start
	}

	onPointerUpShopItem = (pointer: Phaser.Input.Pointer): void => {
		if (!this.chara.getIsShopItem() || !this.chara.input?.enabled) return;

		// Only process as a click if it wasn't a drag
		if (pointer.getDistance() > constants.DRAG_CLICK_THRESHOLD) {
			return; // This was likely a drag, onDragEnd will handle it.
		}

		// Pass pointer.x and pointer.y as the dragStartX/Y for a click.
		// Chara.processShopItemClick now returns void and emits an event.
		// Reversion for a failed click-purchase is handled by the Chara instance listening to SHOP_PURCHASE_FAILED.
		this.processShopItemClick(pointer.x, pointer.y);
	}

	updateShopItemStatus(isShopItem: boolean): void {
		// If it's no longer a shop item, remove the pointerup listener for clicks
		if (!isShopItem) {
			this.chara.off(Phaser.Input.Events.POINTER_UP, this.onPointerUpShopItem);
		}
		// If it becomes a shop item (e.g. item returned to shop), re-add if necessary,
		// though current flow is one-way (shop -> owned).
	}

	destroy(): void {
		this.chara.off(Phaser.Input.Events.DRAG_START, this.onDragStart);
		this.chara.off(Phaser.Input.Events.DRAG, this.onDrag);
		this.chara.off(Phaser.Input.Events.DROP, this.onDrop);
		this.chara.off(Phaser.Input.Events.DRAG_END, this.onDragEnd);
		this.chara.off(Phaser.Input.Events.POINTER_UP, this.onPointerUpShopItem);
	}

	/**
	 * Called when a shop item is clicked. Emits an event to request a purchase attempt.
	 */
	processShopItemClick(_clickX: number, _clickY: number): void {
		this.chara.scene.events.emit(
			GameEvents.SHOP_ITEM_CLICK_PURCHASE_REQUESTED,
			{
				shopUnitData: { ...this.chara.unit },
				shopCharaId: this.chara.id,
				dragStartX: this.chara.x,
				dragStartY: this.chara.y
			}
		);
	}

	/**
	 * Processes a drop action onto a game object, typically a board tile zone or sell zone.
	 * Determines if the Chara is an owned unit or a shop item and delegates to the appropriate handler.
	 */
	processDrop(dropTarget: Phaser.GameObjects.GameObject, dragStartX: number, dragStartY: number): boolean {
		if (dropTarget.name === sc.SHOP_SELL_ZONE_NAME) {
			if (!this.chara.getIsShopItem()) { // Can only sell owned units
				this._handleSellUnit();
				return true; // Drop handled
			} else {
				// Shop item dropped on sell zone - invalid action, revert.
				return false;
			}
		}

		// Check if the drop target is a drop zone from the player board
		const playerBoard = Board.getSharedPlayerBoard();
		if (!playerBoard) {
			console.warn("CharaInputHandler.processDrop: No shared player board instance.");
			return false;
		}
		const slotIndex = playerBoard.dropZones.indexOf(dropTarget as Phaser.GameObjects.Zone);
		if (slotIndex === -1) {
			// Dropped outside a valid player board slot or the sell zone.
			return false;
		}
		// Calculate tile coordinates from slot index (3x3 board)
		const tileX = slotIndex % 3;
		const tileY = Math.floor(slotIndex / 3);
		const tile = vec2(tileX, tileY);

		if (!this.chara.getIsShopItem()) { // It's an owned unit
			this._handleDropOwnedUnit(tile, dragStartX, dragStartY);
			return true; // Assume the request was successfully emitted. Outcome handled by events.
		} else { // Assumed to be a shop item
			this._handleDropShopItem(tile, dragStartX, dragStartY);
			return true; // Assume the request was successfully emitted. Outcome handled by events.
		}
	}

	/**
	 * Handles dropping an owned unit onto the board, emitting a move request.
	 */
	private _handleDropOwnedUnit(tile: Vec2, dragStartX: number, dragStartY: number): void {
		this.chara.scene.events.emit(GameEvents.OWNED_UNIT_MOVE_REQUESTED, {
			unitId: this.chara.unit.id,
			targetTile: tile,
			dragStartX,
			dragStartY
		});
	}

	/**
	 * Handles dropping a shop item onto the board, emitting a purchase request.
	 */
	private _handleDropShopItem(tile: Vec2, dragStartX: number, dragStartY: number): void {
		this.chara.scene.events.emit(GameEvents.SHOP_ITEM_DRAG_PURCHASE_REQUESTED, {
			shopUnitData: { ...this.chara.unit }, // Pass a copy
			shopCharaId: this.chara.id,
			targetTile: tile,
			dragStartX,
			dragStartY
		});
	}

	/**
	 * Handles selling an owned unit by emitting an event.
	 */
	private _handleSellUnit(): void {
		const sellPrice = Math.floor(constants.SHOP_ITEM_PURCHASE_COST / 2);
		this.chara.scene.events.emit(GameEvents.OWNED_UNIT_SOLD, { unitId: this.chara.unit.id, soldForGold: sellPrice });
	}
}