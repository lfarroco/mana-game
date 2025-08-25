import { FORCE_ID_PLAYER, SHOP_ITEM_PURCHASE_COST } from "../../../constants/constants";
import { PartyBoard } from "../../../Models/Board";
import { Unit } from "../../../Models/Entities/Unit";
import { Vec2, vec2 } from "../../../Models/Geometry.pure";
import { scene } from "../../../Scenes/Battleground/BattlegroundScene";
import * as Shop from "../../../Scenes/Battleground/Systems/Shop";
import { hideTooltip } from "../../../UI/Tooltip";
import { tween } from "../../../Utils/animation";
import { getUnit, getIsShopItem, getCharaById, getCharaPosition, Chara } from "../Chara";
import { onDrop } from "./onDrop";
import { onPointerUpShopItem } from "./onPointerUpShopItem";
import { onDragStart } from "./onDragStart";
import { onDrag } from "./onDrag";
import { onDragEnd } from "./onDragEnd";

export type CharaInputHandler = {
	dragStartX: number;
	dragStartY: number;
	dragStartVec: Vec2;
	wasDragSuccessful: boolean;
	chara: Chara;
	unitId: string;
};

export function create(chara: Chara) {

	const state: CharaInputHandler = {
		dragStartX: 0,
		dragStartY: 0,
		dragStartVec: vec2(0, 0),
		wasDragSuccessful: false,
		chara,
		unitId: getUnit(chara).id
	}

	if (getUnit(chara).force === FORCE_ID_PLAYER || getIsShopItem(state.unitId)) {
		scene.input.setDraggable(chara, true);

		chara.on(Phaser.Input.Events.DRAG_START, onDragStart(state));
		chara.on(Phaser.Input.Events.DRAG, onDrag(state));
		chara.on(Phaser.Input.Events.DROP, onDrop(state));
		chara.on(Phaser.Input.Events.DRAG_END, onDragEnd(state));

		if (getIsShopItem(state.unitId)) {
			chara.on(Phaser.Input.Events.POINTER_UP, onPointerUpShopItem(state));
		}
	}

	return state
}


export const processShopItemClick = (handlerState: CharaInputHandler) => (_clickX: number, _clickY: number): void => {
	const { chara, unitId } = handlerState;
	Shop.events.itemClickPurchaseRequested(
		{ ...getUnit(chara) },
		unitId,
		chara.x,
		chara.y
	);
}

export const _handleDropShopItem = (handlerState: CharaInputHandler) => (tile: Vec2, dragStartX: number, dragStartY: number) => {
	const { chara } = handlerState
	Shop.events.itemDragPurchaseRequested(
		{ ...getUnit(chara) },
		getUnit(chara).id,
		tile,
		dragStartX,
		dragStartY
	);
}

export const _handleSellUnit = (handlerState: CharaInputHandler): void => {
	const sellPrice = Math.floor(SHOP_ITEM_PURCHASE_COST / 2);
	Shop.events.ownedUnitSold(getUnit(handlerState.chara).id, sellPrice);
}


export const processOwnedUnitMoveRequest = (
	unitId: string, targetTile: Vec2, dragStartX: number, dragStartY: number
) => {
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
	const movedChara = getCharaById(movedUnit.id);
	const pos = getCharaPosition(movedUnit);
	tween({
		targets: [movedChara],
		...pos
	})
}

const _applySwapVisual = (movedUnit: Unit, swappedUnit: Unit) => {
	const movedChara = getCharaById(movedUnit.id);
	const swappedChara = getCharaById(swappedUnit.id);
	const movedPos = getCharaPosition(movedUnit);
	const swappedPos = getCharaPosition(swappedUnit);
	tween({ targets: [movedChara], ...movedPos });
	tween({ targets: [swappedChara], ...swappedPos });
}

const _movementRejected = (unitId: string, dragStartX: number, dragStartY: number, _reason: string) => {
	const failedChara = getCharaById(unitId);
	hideTooltip();
	tween({ targets: [failedChara], ...vec2(dragStartX, dragStartY) });
}