import { tween } from "../../Utils/animation";
import * as Geometry from "@Models/Geometry";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { Unit } from "@Models/Entities/Unit";

import * as constants from "../../constants/constants";
import * as Shop from "@Scenes/Battleground/Systems/Shop";
import * as Board from "@Models/Board";
import * as Tooltip from "@UI/Tooltip";

import * as Chara from "./Chara";
import * as input from "./input";
import events from "./events";

export type InputHandler = {
	dragStartX: number;
	dragStartY: number;
	dragStartVec: Vec2;
	wasDragSuccessful: boolean;
	chara: Chara.Chara;
	unitId: string;
};

export function init(chara: Chara.Chara) {

	const state: InputHandler = {
		dragStartX: 0,
		dragStartY: 0,
		dragStartVec: Geometry.vec2(0, 0),
		wasDragSuccessful: false,
		chara,
		unitId: Chara.getUnit(chara).id
	};

	const isPlayerUnit = Chara.getUnit(chara).force === constants.FORCE_ID_PLAYER
	const isShopUnit = Chara.getIsShopItem(state.unitId)

	if (isPlayerUnit || isShopUnit) {
		scene.input.setDraggable(chara, true);

		chara.on(Phaser.Input.Events.DRAG_START, onDragStart(state));
		chara.on(Phaser.Input.Events.DRAG, onDrag(chara));
		chara.on(Phaser.Input.Events.DROP, onDrop(state));
		chara.on(Phaser.Input.Events.DRAG_END, onDragEnd(state));

		if (!isShopUnit) return;

		chara.on(Phaser.Input.Events.POINTER_UP, onPointerUpShopItem(state));
	}

	return state;
}

export const onDrag = (chara: Chara.Chara) => (
	_pointer: Pointer,
	dragX: number,
	dragY: number
): void => {
	chara.x = dragX;
	chara.y = dragY;
}; export const onDragEnd = (handlerState: InputHandler) => (_pointer: Pointer) => {
	const { chara } = handlerState;

	tween({
		targets: [chara],
		angle: 0,
		duration: 100,
		ease: "Cubic.Out",
	});

	if (!Chara.getIsShopItem(handlerState.unitId)) {
		Shop.UI.hideSellZone();
	}

	if (!handlerState.wasDragSuccessful) {
		tween({
			targets: [chara],
			...handlerState.dragStartVec,
			duration: 150,
		});
	}

	handlerState.wasDragSuccessful = false;
};

export const onDragStart = (handlerState: InputHandler) => (
	_pointer: Pointer,
	_dragX: number,
	_dragY: number
) => {
	const { chara } = handlerState;
	handlerState.dragStartX = chara.x;
	handlerState.dragStartY = chara.y;
	handlerState.dragStartVec = Geometry.vec2(chara.x, chara.y);
	handlerState.wasDragSuccessful = false;

	if (Chara.getIsShopItem(handlerState.unitId)) {
		Shop.UI.bringShopChildToTop(chara);
	} else {
		scene.children.bringToTop(chara);
	}

	tween({
		targets: [chara],
		angle: -10,
		duration: 100,
		ease: "Cubic.Out",
	});

	if (!Chara.getIsShopItem(handlerState.unitId)) {
		Shop.UI.showSellZone();
	}

	Tooltip.hideTooltip();
};

export const onDrop = (handlerState: input.InputHandler) => (
	_pointer: Pointer,
	dropZoneTarget: Phaser.GameObjects.GameObject
): void => {
	handlerState.wasDragSuccessful = processDrop(handlerState)(
		dropZoneTarget,
		handlerState.dragStartX,
		handlerState.dragStartY
	);
};

const processDrop = (handlerState: input.InputHandler) => (
	dropTarget: Phaser.GameObjects.GameObject,
	dragStartX: number,
	dragStartY: number
): boolean => {
	if (dropTarget.name === Shop.constants.SHOP_SELL_ZONE_NAME) {
		if (!Chara.getIsShopItem(handlerState.unitId)) {
			events.onSell(handlerState.chara);
			return true;
		}

		return false;
	}

	const playerBoard = Board.getBoardState();
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
	const tile = Geometry.vec2(tileX, tileY);

	if (!Chara.getIsShopItem(handlerState.unitId)) {
		processOwnedUnitMoveRequest(handlerState.unitId, tile, dragStartX, dragStartY);
		return true;
	}

	_handleDropShopItem(handlerState)(tile, dragStartX, dragStartY);
	return true;
};

const _handleDropShopItem = (handlerState: input.InputHandler) => (
	tile: Vec2,
	dragStartX: number,
	dragStartY: number
) => {
	const { chara } = handlerState;

	Shop.events.itemDragPurchaseRequested({ ...Chara.getUnit(chara) }, Chara.getUnit(chara).id, tile, dragStartX, dragStartY);
};

export const processOwnedUnitMoveRequest = (
	unitId: string,
	targetTile: Vec2,
	dragStartX: number,
	dragStartY: number
) => {
	const units = scene.state.gameData.player.units;
	const unit = units.find((u) => u.id === unitId);

	if (!unit) {
		_movementRejected(unitId, dragStartX, dragStartY, "UNIT_NOT_FOUND");
		return;
	}

	if (unit.position.x === targetTile.x && unit.position.y === targetTile.y) {
		_movementRejected(unitId, dragStartX, dragStartY, "NO_OP");
		return;
	}

	const occupier = units.find((u) => u.id !== unitId && u.position.x === targetTile.x && u.position.y === targetTile.y);
	if (occupier) {
		_executeSwap(unit, occupier, targetTile, units);
		return;
	}

	_executeMove(unit, targetTile, units);
};

const _executeMove = (unit: Unit, target: Vec2, units: Unit[]) => {
	const result = Board.updateUnitPosition(unit, target, units);
	if (!result) return;

	_applyMoveVisual(result.movedUnit);
};

const _executeSwap = (unit: Unit, _occupier: Unit, target: Vec2, units: Unit[]) => {
	const result = Board.updateUnitPosition(unit, target, units);
	if (!result) return;

	_applySwapVisual(result.movedUnit, result.swappedUnit!);
};

const _applyMoveVisual = (movedUnit: Unit) => {
	const movedChara = Chara.getCharaById(movedUnit.id);
	const pos = Chara.getCharaPosition(movedUnit);

	tween({ targets: [movedChara], ...pos });
};

const _applySwapVisual = (movedUnit: Unit, swappedUnit: Unit) => {
	const movedChara = Chara.getCharaById(movedUnit.id);
	const swappedChara = Chara.getCharaById(swappedUnit.id);
	const movedPos = Chara.getCharaPosition(movedUnit);
	const swappedPos = Chara.getCharaPosition(swappedUnit);

	tween({ targets: [movedChara], ...movedPos });
	tween({ targets: [swappedChara], ...swappedPos });
};

const _movementRejected = (unitId: string, dragStartX: number, dragStartY: number, _reason: string) => {
	const failedChara = Chara.getCharaById(unitId);
	Tooltip.hideTooltip();

	tween({ targets: [failedChara], ...Geometry.vec2(dragStartX, dragStartY) });
};

export const onPointerUpShopItem = (handlerState: InputHandler) => (pointer: Pointer): void => {
	if (!Chara.getIsShopItem(handlerState.unitId) || !handlerState.chara.input?.enabled) return;

	if (pointer.getDistance() > constants.DRAG_CLICK_THRESHOLD) {
		return;
	}

	processShopItemClick(handlerState)(pointer.x, pointer.y);
};

const processShopItemClick = (handlerState: InputHandler) => (_clickX: number, _clickY: number): void => {
	const { chara, unitId } = handlerState;
	Shop.events.itemClickPurchaseRequested(
		{ ...Chara.getUnit(chara) },
		unitId,
		chara.x,
		chara.y
	);
};

