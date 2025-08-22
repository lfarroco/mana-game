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
import { scene } from "../../Scenes/Battleground/BattlegroundScene";
import { PartyBoard } from "../../Models/Board";
import * as CharaManager from "../../Scenes/Battleground/Systems/CharaManager";
import { Unit } from "../../Models/Entities/Unit";
import * as Shop from "../../Scenes/Battleground/Systems/Shop/Shop";

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
			scene.input.setDraggable(this.chara.container, true);

			this.chara.container.on(Phaser.Input.Events.DRAG_START, this.onDragStart);
			this.chara.container.on(Phaser.Input.Events.DRAG, this.onDrag);
			this.chara.container.on(Phaser.Input.Events.DROP, this.onDrop);
			this.chara.container.on(Phaser.Input.Events.DRAG_END, this.onDragEnd);
		}

		if (this.chara.getIsShopItem()) {
			this.chara.container.on(Phaser.Input.Events.POINTER_UP, this.onPointerUpShopItem);
		}
	}

	onDragStart = (_pointer: Phaser.Input.Pointer, _dragX: number, _dragY: number): void => {
		this.dragStartX = this.chara.container.x;
		this.dragStartY = this.chara.container.y;
		this.dragStartVec = vec2(this.dragStartX, this.dragStartY);
		this.wasDragSuccessful = false;

		if (this.chara.getIsShopItem()) {
			Shop.flyout.bringChildToTop(this.chara.container);
		} else {
			scene.children.bringToTop(this.chara.container);
		}

		tween({
			targets: [this.chara.container],
			angle: -10,
			duration: 100,
			ease: "Cubic.Out",
		});
		if (!this.chara.getIsShopItem()) {
			Shop.shopUI.showSellZone();
		}
		hideTooltip();
	}

	onDrag = (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void => {
		this.chara.container.x = dragX;
		this.chara.container.y = dragY;
	}

	onDrop = (_pointer: Phaser.Input.Pointer, dropZoneTarget: Phaser.GameObjects.GameObject): void => {
		this.wasDragSuccessful = this.processDrop(dropZoneTarget, this.dragStartX, this.dragStartY);
	}

	onDragEnd = (_pointer: Phaser.Input.Pointer): void => {
		scene.tweens.add({
			targets: [this.chara.container],
			angle: 0,
			duration: 100,
			ease: "Cubic.Out",
		});

		if (!this.chara.getIsShopItem()) {
			Shop.shopUI.hideSellZone();
		}

		if (!this.wasDragSuccessful) {
			tween({
				targets: [this.chara.container],
				...this.dragStartVec,
				duration: 150,
			});
		}

		this.wasDragSuccessful = false;
	}

	onPointerUpShopItem = (pointer: Phaser.Input.Pointer): void => {
		if (!this.chara.getIsShopItem() || !this.chara.container.input?.enabled) return;

		if (pointer.getDistance() > constants.DRAG_CLICK_THRESHOLD) {
			return;
		}

		this.processShopItemClick(pointer.x, pointer.y);
	}

	updateShopItemStatus(isShopItem: boolean): void {
		if (!isShopItem) {
			this.chara.container.off(Phaser.Input.Events.POINTER_UP, this.onPointerUpShopItem);
		}
	}

	destroy(): void {
		this.chara.container.off(Phaser.Input.Events.DRAG_START, this.onDragStart);
		this.chara.container.off(Phaser.Input.Events.DRAG, this.onDrag);
		this.chara.container.off(Phaser.Input.Events.DROP, this.onDrop);
		this.chara.container.off(Phaser.Input.Events.DRAG_END, this.onDragEnd);
		this.chara.container.off(Phaser.Input.Events.POINTER_UP, this.onPointerUpShopItem);
	}

	processShopItemClick(_clickX: number, _clickY: number): void {
		Shop.handleShopItemClickPurchaseRequested({
			shopUnitData: { ...this.chara.unit },
			shopCharaId: this.chara.id,
			dragStartX: this.chara.container.x,
			dragStartY: this.chara.container.y
		});
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
		this._processOwnedUnitMoveRequest({
			unitId: this.chara.unit.id,
			targetTile: tile,
			dragStartX,
			dragStartY
		});
	}

	private _handleDropShopItem(tile: Vec2, dragStartX: number, dragStartY: number): void {
		Shop.handleShopItemDragPurchaseRequested({
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

	requestOwnedUnitMove(targetTile: Vec2, dragStartX: number, dragStartY: number): void {
		this._processOwnedUnitMoveRequest({
			unitId: this.chara.unit.id,
			targetTile,
			dragStartX,
			dragStartY
		});
	}

	private _processOwnedUnitMoveRequest(payload: { unitId: string; targetTile: Vec2; dragStartX: number; dragStartY: number; }): void {
		const { unitId, targetTile, dragStartX, dragStartY } = payload;

		this._attemptOwnedUnitMovement(unitId, targetTile, dragStartX, dragStartY);
	}

	private _attemptOwnedUnitMovement(unitId: string, targetTile: Vec2, dragStartX: number, dragStartY: number) {
		const units = scene.state.gameData.player.units;
		const unit = units.find(u => u.id === unitId);
		if (!unit) {
			this._movementRejected(unitId, dragStartX, dragStartY, "UNIT_NOT_FOUND");
			return;
		}
		if (unit.position.x === targetTile.x && unit.position.y === targetTile.y) {
			this._movementRejected(unitId, dragStartX, dragStartY, "NO_OP");
			return;
		}
		const occupier = units.find(u => u.id !== unitId && u.position.x === targetTile.x && u.position.y === targetTile.y);
		if (occupier) {
			this._executeSwap(unit, occupier, targetTile, units);
			return;
		}
		this._executeMove(unit, targetTile, units);
	}

	private _executeMove(unit: Unit, target: Vec2, units: Unit[]) {
		const result = PartyBoard.updateUnitPosition(unit, target, units);
		if (!result) return;
		this._applyMoveVisual(result.movedUnit);
	}

	private _executeSwap(unit: Unit, _occupier: Unit, target: Vec2, units: Unit[]) {
		const result = PartyBoard.updateUnitPosition(unit, target, units);
		if (!result) return;
		this._applySwapVisual(result.movedUnit, result.swappedUnit!);
	}

	private _applyMoveVisual(movedUnit: Unit) {
		const movedChara = CharaManager.getChara(movedUnit.id);
		if (!movedChara) return;
		const pos = CharaManager.getCharaPosition(movedUnit);
		tween({
			targets: [movedChara.container],
			...pos
		})
	}

	private _applySwapVisual(movedUnit: Unit, swappedUnit: Unit) {
		const movedChara = CharaManager.getChara(movedUnit.id);
		const swappedChara = CharaManager.getChara(swappedUnit.id);
		const movedPos = CharaManager.getCharaPosition(movedUnit);
		const swappedPos = CharaManager.getCharaPosition(swappedUnit);
		tween({ targets: [movedChara.container], ...movedPos });
		tween({ targets: [swappedChara.container], ...swappedPos });
	}

	private _movementRejected(unitId: string, dragStartX: number, dragStartY: number, _reason: string) {
		const failedChara = CharaManager.getChara(unitId);
		hideTooltip();
		tween({ targets: [failedChara.container], ...vec2(dragStartX, dragStartY) });
	}
}