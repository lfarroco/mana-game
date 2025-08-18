import Phaser from "phaser";
import { Chara } from "./Chara";
import { FORCE_ID_PLAYER } from "../../constants/constants";
import * as constants from "../../constants/constants";
import { tween } from "../../Utils/animation";
import { Vec2 } from "../../Models/Geometry";
import * as Board from "../../Models/Board";
import { vec2 } from "../../Models/Geometry";
import * as sc from "../../Scenes/Battleground/Systems/Shop/ShopConstants";
import { hideTooltip } from "../../UI/Tooltip";
import { shop } from "../../Scenes/Battleground/Systems/Shop/Shop";
import { scene } from "../../Scenes/Battleground/BattlegroundScene";

export class CharaInputHandler {
	dragStartX: number = 0;
	dragStartY: number = 0;
	dragStartVec: Vec2 = vec2(0, 0);
	wasDragSuccessful: boolean = false;
	chara: Chara;

	constructor(chara: Chara) {
		this.chara = chara;
		this.setupInteractions();
	}

	setupInteractions(): void {

		if (this.chara.unit.force === FORCE_ID_PLAYER || this.chara.getIsShopItem()) {
			this.chara.scene.input.setDraggable(this.chara, true);

			this.chara.on(Phaser.Input.Events.DRAG_START, this.onDragStart);
			this.chara.on(Phaser.Input.Events.DRAG, this.onDrag);
			this.chara.on(Phaser.Input.Events.DROP, this.onDrop);
			this.chara.on(Phaser.Input.Events.DRAG_END, this.onDragEnd);
		}

		if (this.chara.getIsShopItem()) {
			this.chara.on(Phaser.Input.Events.POINTER_UP, this.onPointerUpShopItem);
		}
	}

	onDragStart = (_pointer: Phaser.Input.Pointer, _dragX: number, _dragY: number): void => {
		this.dragStartX = this.chara.x;
		this.dragStartY = this.chara.y;
		this.dragStartVec = vec2(this.dragStartX, this.dragStartY);
		this.wasDragSuccessful = false;

		if (this.chara.getIsShopItem()) {
			this.chara.shop.flyout.bringChildToTop(this.chara);
		} else {
			this.chara.scene.children.bringToTop(this.chara);
		}

		tween({
			targets: [this.chara],
			angle: -10,
			duration: 100,
			ease: "Cubic.Out",
		});
		if (!this.chara.getIsShopItem()) {
			this.chara.shop.shopUI.showSellZone();
		}
		hideTooltip();
	}

	onDrag = (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void => {
		this.chara.x = dragX;
		this.chara.y = dragY;
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

		if (!this.chara.getIsShopItem()) {
			this.chara.shop.shopUI.hideSellZone();
		}

		if (!this.wasDragSuccessful) {
			this.chara.moveToPosition(this.dragStartVec);
		}

		this.wasDragSuccessful = false;
	}

	onPointerUpShopItem = (pointer: Phaser.Input.Pointer): void => {
		if (!this.chara.getIsShopItem() || !this.chara.input?.enabled) return;

		if (pointer.getDistance() > constants.DRAG_CLICK_THRESHOLD) {
			return;
		}

		this.processShopItemClick(pointer.x, pointer.y);
	}

	updateShopItemStatus(isShopItem: boolean): void {
		if (!isShopItem) {
			this.chara.off(Phaser.Input.Events.POINTER_UP, this.onPointerUpShopItem);
		}
	}

	destroy(): void {
		this.chara.off(Phaser.Input.Events.DRAG_START, this.onDragStart);
		this.chara.off(Phaser.Input.Events.DRAG, this.onDrag);
		this.chara.off(Phaser.Input.Events.DROP, this.onDrop);
		this.chara.off(Phaser.Input.Events.DRAG_END, this.onDragEnd);
		this.chara.off(Phaser.Input.Events.POINTER_UP, this.onPointerUpShopItem);
	}

	processShopItemClick(_clickX: number, _clickY: number): void {
		shop.handleShopItemClickPurchaseRequested({
			shopUnitData: { ...this.chara.unit },
			shopCharaId: this.chara.id,
			dragStartX: this.chara.x,
			dragStartY: this.chara.y
		})
	}

	processDrop(dropTarget: Phaser.GameObjects.GameObject, dragStartX: number, dragStartY: number): boolean {
		if (dropTarget.name === sc.SHOP_SELL_ZONE_NAME) {
			if (!this.chara.getIsShopItem()) {
				this._handleSellUnit();
				return true;
			} else {
				return false;
			}
		}

		const playerBoard = Board.getSharedPlayerBoard();
		if (!playerBoard) {
			console.warn("CharaInputHandler.processDrop: No shared player board instance.");
			return false;
		}
		const slotIndex = playerBoard.dropZones.indexOf(dropTarget as Phaser.GameObjects.Zone);
		if (slotIndex === -1) {
			return false;
		}
		const tileX = slotIndex % 3;
		const tileY = Math.floor(slotIndex / 3);
		const tile = vec2(tileX, tileY);

		if (!this.chara.getIsShopItem()) {
			this._handleDropOwnedUnit(tile, dragStartX, dragStartY);
			return true;
		} else {
			this._handleDropShopItem(tile, dragStartX, dragStartY);
			return true;
		}
	}

	private _handleDropOwnedUnit(tile: Vec2, dragStartX: number, dragStartY: number): void {
		scene.handleOwnedUnitMoveRequest({
			unitId: this.chara.unit.id,
			targetTile: tile,
			dragStartX,
			dragStartY
		})
	}

	private _handleDropShopItem(tile: Vec2, dragStartX: number, dragStartY: number): void {
		shop.handleShopItemDragPurchaseRequested({
			shopUnitData: { ...this.chara.unit },
			shopCharaId: this.chara.id,
			targetTile: tile,
			dragStartX,
			dragStartY
		})
	}

	private _handleSellUnit(): void {
		const sellPrice = Math.floor(constants.SHOP_ITEM_PURCHASE_COST / 2);
		scene.handleOwnedUnitSold({ unitId: this.chara.unit.id, soldForGold: sellPrice });
	}
}