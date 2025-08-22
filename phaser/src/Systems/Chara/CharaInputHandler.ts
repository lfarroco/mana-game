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

export type CharaInputHandler = {
	dragStartX: number;
	dragStartY: number;
	dragStartVec: Vec2;
	wasDragSuccessful: boolean;
	chara: Chara;
};

export function create(chara: Chara) {

	const state: CharaInputHandler = {
		dragStartX: 0,
		dragStartY: 0,
		dragStartVec: vec2(0, 0),
		wasDragSuccessful: false,
		chara
	}

	if (chara.unit.force === FORCE_ID_PLAYER || chara.getIsShopItem()) {
		scene.input.setDraggable(chara.container, true);

		chara.container.on(Phaser.Input.Events.DRAG_START, onDragStart(state));
		chara.container.on(Phaser.Input.Events.DRAG, onDrag(state));
		chara.container.on(Phaser.Input.Events.DROP, onDrop(state));
		chara.container.on(Phaser.Input.Events.DRAG_END, onDragEnd(state));

		if (chara.getIsShopItem()) {
			chara.container.on(Phaser.Input.Events.POINTER_UP, onPointerUpShopItem(state));
		}
	}

	return state
}

const onDragStart = (handlerState: CharaInputHandler) => (_pointer: Phaser.Input.Pointer, _dragX: number, _dragY: number) => {
	const { chara } = handlerState;
	handlerState.dragStartX = chara.container.x;
	handlerState.dragStartY = chara.container.y;
	handlerState.dragStartVec = vec2(handlerState.dragStartX, handlerState.dragStartY);
	handlerState.wasDragSuccessful = false;

	if (chara.getIsShopItem()) {
		Shop.flyout.bringChildToTop(chara.container);
	} else {
		scene.children.bringToTop(chara.container);
	}

	tween({
		targets: [chara.container],
		angle: -10,
		duration: 100,
		ease: "Cubic.Out",
	});
	if (!chara.getIsShopItem()) {
		Shop.shopUI.showSellZone();
	}
	hideTooltip();
}

const onDrag = (handlerState: CharaInputHandler) => (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void => {
	const { chara } = handlerState;
	chara.container.x = dragX;
	chara.container.y = dragY;
}

const onDrop = (handlerState: CharaInputHandler) => (_pointer: Phaser.Input.Pointer, dropZoneTarget: Phaser.GameObjects.GameObject): void => {
	handlerState.wasDragSuccessful = processDrop(handlerState)(dropZoneTarget, handlerState.dragStartX, handlerState.dragStartY);
}

const onDragEnd = (handlerState: CharaInputHandler) => (_pointer: Phaser.Input.Pointer): void => {
	const { chara } = handlerState;
	scene.tweens.add({
		targets: [handlerState.chara.container],
		angle: 0,
		duration: 100,
		ease: "Cubic.Out",
	});

	if (!chara.getIsShopItem()) {
		Shop.shopUI.hideSellZone();
	}

	if (!handlerState.wasDragSuccessful) {
		tween({
			targets: [chara.container],
			...handlerState.dragStartVec,
			duration: 150,
		});
	}

	handlerState.wasDragSuccessful = false;
}

const onPointerUpShopItem = (handlerState: CharaInputHandler) => (pointer: Phaser.Input.Pointer): void => {
	if (!handlerState.chara.getIsShopItem() || !handlerState.chara.container.input?.enabled) return;

	if (pointer.getDistance() > constants.DRAG_CLICK_THRESHOLD) {
		return;
	}

	processShopItemClick(handlerState)(pointer.x, pointer.y);
}

const processShopItemClick = (handlerState: CharaInputHandler) => (_clickX: number, _clickY: number): void => {
	const { chara } = handlerState;
	Shop.handleShopItemClickPurchaseRequested({
		shopUnitData: { ...chara.unit },
		shopCharaId: chara.id,
		dragStartX: chara.container.x,
		dragStartY: chara.container.y
	});
}

const processDrop = (handlerState: CharaInputHandler) => (dropTarget: Phaser.GameObjects.GameObject, dragStartX: number, dragStartY: number): boolean => {
	if (dropTarget.name === sc.SHOP_SELL_ZONE_NAME) {
		if (!handlerState.chara.getIsShopItem()) {
			_handleSellUnit(handlerState);
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

	if (!handlerState.chara.getIsShopItem()) {
		_handleDropOwnedUnit(handlerState)(tile, dragStartX, dragStartY);
		return true;
	} else {
		_handleDropShopItem(handlerState)(tile, dragStartX, dragStartY);
		return true;
	}
}

const _handleDropOwnedUnit = (handlerState: CharaInputHandler) => (tile: Vec2, dragStartX: number, dragStartY: number) => {
	_processOwnedUnitMoveRequest({
		unitId: handlerState.chara.unit.id,
		targetTile: tile,
		dragStartX,
		dragStartY
	});
}

const _handleDropShopItem = (handlerState: CharaInputHandler) => (tile: Vec2, dragStartX: number, dragStartY: number) => {
	const { chara } = handlerState
	Shop.handleShopItemDragPurchaseRequested({
		shopUnitData: { ...chara.unit },
		shopCharaId: chara.id,
		targetTile: tile,
		dragStartX,
		dragStartY
	})
}

const _handleSellUnit = (handlerState: CharaInputHandler): void => {
	const sellPrice = Math.floor(constants.SHOP_ITEM_PURCHASE_COST / 2);
	scene.handleOwnedUnitSold({ unitId: handlerState.chara.unit.id, soldForGold: sellPrice });
}

export const requestOwnedUnitMove = (handlerState: CharaInputHandler) => (targetTile: Vec2, dragStartX: number, dragStartY: number) => {
	const { chara } = handlerState;

	_processOwnedUnitMoveRequest({
		unitId: chara.unit.id,
		targetTile,
		dragStartX,
		dragStartY
	});
}

const _processOwnedUnitMoveRequest = (payload: { unitId: string; targetTile: Vec2; dragStartX: number; dragStartY: number; }) => {
	const { unitId, targetTile, dragStartX, dragStartY } = payload;

	_attemptOwnedUnitMovement(unitId, targetTile, dragStartX, dragStartY);
}


const _attemptOwnedUnitMovement = (unitId: string, targetTile: Vec2, dragStartX: number, dragStartY: number) => {
	const units = scene.state.gameData.player.units;
	const unit = units.find(u => u.id === unitId);
	if (!unit) {
		_movementRejected(unitId, dragStartX, dragStartY, "UNIT_NOT_FOUND");
		return;
	}
	if (unit.position.x === targetTile.x && unit.position.y === targetTile.y) {
		_movementRejected(unitId, dragStartX, dragStartY, "NO_OP");
		return;
	}
	const occupier = units.find(u => u.id !== unitId && u.position.x === targetTile.x && u.position.y === targetTile.y);
	if (occupier) {
		_executeSwap(unit, occupier, targetTile, units);
		return;
	}
	_executeMove(unit, targetTile, units);
}

const _executeMove = (unit: Unit, target: Vec2, units: Unit[]) => {
	const result = PartyBoard.updateUnitPosition(unit, target, units);
	if (!result) return;
	_applyMoveVisual(result.movedUnit);
}

const _executeSwap = (unit: Unit, _occupier: Unit, target: Vec2, units: Unit[]) => {
	const result = PartyBoard.updateUnitPosition(unit, target, units);
	if (!result) return;
	_applySwapVisual(result.movedUnit, result.swappedUnit!);
}

const _applyMoveVisual = (movedUnit: Unit) => {
	const movedChara = CharaManager.getChara(movedUnit.id);
	const pos = CharaManager.getCharaPosition(movedUnit);
	tween({
		targets: [movedChara.container],
		...pos
	})
}

const _applySwapVisual = (movedUnit: Unit, swappedUnit: Unit) => {
	const movedChara = CharaManager.getChara(movedUnit.id);
	const swappedChara = CharaManager.getChara(swappedUnit.id);
	const movedPos = CharaManager.getCharaPosition(movedUnit);
	const swappedPos = CharaManager.getCharaPosition(swappedUnit);
	tween({ targets: [movedChara.container], ...movedPos });
	tween({ targets: [swappedChara.container], ...swappedPos });
}

const _movementRejected = (unitId: string, dragStartX: number, dragStartY: number, _reason: string) => {
	const failedChara = CharaManager.getChara(unitId);
	hideTooltip();
	tween({ targets: [failedChara.container], ...vec2(dragStartX, dragStartY) });
}