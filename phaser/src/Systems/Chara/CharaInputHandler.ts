import Phaser from "phaser";
import { Chara } from "./Chara";
import { FORCE_ID_PLAYER } from "../../constants/constants";
import * as constants from "../../constants/constants";
import { tween } from "../../Utils/animation";
import { GameEvents } from "../../constants/events";

export class CharaInputHandler {
	private dragStartX: number = 0;
	private dragStartY: number = 0;
	private wasDragSuccessful: boolean = false;

	constructor(private chara: Chara) {
		this.setupInteractions();
	}

	private setupInteractions(): void {
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

	private onDragStart = (_pointer: Phaser.Input.Pointer, _dragX: number, _dragY: number): void => {
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
			this.chara.scene.shop.shopUI.showSellZone();
		}
		this.chara.scene.events.emit(GameEvents.TOOLTIP_HIDE);
	}

	private onDrag = (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void => {
		this.chara.x = dragX;
		this.chara.y = dragY;
		// Potentially emit an event if other systems need to react to dragging over areas
	}

	private onDrop = (_pointer: Phaser.Input.Pointer, dropZoneTarget: Phaser.GameObjects.GameObject): void => {
		// This flag is set by the Chara's internal logic after processing the drop.
		// Here, we just forward the event.
		this.wasDragSuccessful = this.chara.processDrop(dropZoneTarget, this.dragStartX, this.dragStartY);
	}

	private onDragEnd = (_pointer: Phaser.Input.Pointer): void => {
		this.chara.scene.tweens.add({
			targets: [this.chara],
			angle: 0,
			duration: 100,
			ease: "Cubic.Out",
		});

		// Always hide the sell zone when a drag ends
		if (!this.chara.getIsShopItem()) {
			this.chara.scene.shop.shopUI.hideSellZone();
		}
		if (!this.wasDragSuccessful) {
			this.chara.revertDragOrFailedPurchase(this.dragStartX, this.dragStartY);
		}
		// Reset for next potential drag, though wasDragSuccessful is set at start of drag.
		// this.wasDragSuccessful = false; // Not strictly needed here as it's reset on drag_start
	}

	private onPointerUpShopItem = (pointer: Phaser.Input.Pointer): void => {
		if (!this.chara.getIsShopItem() || !this.chara.input?.enabled) return;

		// Only process as a click if it wasn't a drag
		if (pointer.getDistance() > constants.DRAG_CLICK_THRESHOLD) {
			return; // This was likely a drag, onDragEnd will handle it.
		}

		// Pass pointer.x and pointer.y as the dragStartX/Y for a click.
		// Chara.processShopItemClick now returns void and emits an event.
		// Reversion for a failed click-purchase is handled by the Chara instance listening to SHOP_PURCHASE_FAILED.
		this.chara.processShopItemClick(pointer.x, pointer.y);
	}

	public updateShopItemStatus(isShopItem: boolean): void {
		// If it's no longer a shop item, remove the pointerup listener for clicks
		if (!isShopItem) {
			this.chara.off(Phaser.Input.Events.POINTER_UP, this.onPointerUpShopItem);
		}
		// If it becomes a shop item (e.g. item returned to shop), re-add if necessary,
		// though current flow is one-way (shop -> owned).
	}

	public destroy(): void {
		this.chara.off(Phaser.Input.Events.DRAG_START, this.onDragStart);
		this.chara.off(Phaser.Input.Events.DRAG, this.onDrag);
		this.chara.off(Phaser.Input.Events.DROP, this.onDrop);
		this.chara.off(Phaser.Input.Events.DRAG_END, this.onDragEnd);
		this.chara.off(Phaser.Input.Events.POINTER_UP, this.onPointerUpShopItem);
	}
}