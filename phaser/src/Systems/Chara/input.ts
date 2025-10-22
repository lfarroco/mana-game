import { tween } from "../../Utils/animation";
import * as Geometry from "@Models/Geometry";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { Unit } from "@Models/Entities/Unit";

import * as constants from "../../constants/constants";
import * as Shop from "@Scenes/Battleground/Systems/Shop";
import * as Board from "@Models/Board";
import * as Tooltip from "@UI/Tooltip";

import * as Chara from "./Chara";
import * as events from "./events";
import { onCharaPointerOver } from "./CharaTooltip";

import * as SellZone from "../../Scenes/Battleground/Systems/Shop/SellZone"
import * as ph from "@PhaserIO";

const TOUCH_TOOLTIP_INPUT_DOWN_DELAY = 200;

export type InputHandler = {
	wasDragSuccessful: boolean;
	chara: Chara.Chara;
	unitId: string;
	longPressTimer?: Phaser.Time.TimerEvent;
	isLongPressActive: boolean;
};

export function init(chara: Chara.Chara) {

	const state: InputHandler = {
		wasDragSuccessful: false,
		chara,
		unitId: Chara.getUnit(chara).id,
		isLongPressActive: false,
	};

	const isPlayerUnit = Chara.getUnit(chara).force === constants.FORCE_ID_PLAYER
	const isShopUnit = Chara.isShopItem(state.unitId)

	if (isPlayerUnit || isShopUnit) {
		scene.input.setDraggable(chara, true);

		chara.on(Phaser.Input.Events.DRAG_START, onDragStart(state));
		chara.on(Phaser.Input.Events.DRAG, onDrag(chara));

		ph.WhenDroppedOnZone(
			chara,
			SellZone.name,
			() => {
				if (isPlayerUnit)
					events.onSell(state.unitId);
			}
		);

		ph.WhenDroppedOnZone(
			chara,
			"board-cell",
			(zone) => {
				const x = zone.getData("cell-x") as number;
				const y = zone.getData("cell-y") as number;
				const tile = Geometry.vec2(x, y);

				if (!Chara.isShopItem(state.unitId)) {
					const vec = chara.getData("dragStartVec")
					processOwnedUnitMoveRequest(
						state.unitId,
						tile,
						vec.x,
						vec.y,
					);
				} else {
					handleDropShopItem(chara)(tile);
				}
				state.wasDragSuccessful = true;
			}
		)

		chara.on(Phaser.Input.Events.DRAG_END, onDragEnd(state));

		chara.on(Phaser.Input.Events.POINTER_DOWN, onPointerDown(state));
		chara.on(Phaser.Input.Events.POINTER_UP, onPointerUp(state));

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
};

export const onDragEnd = (handlerState: InputHandler) => (_pointer: Pointer) => {
	const { chara } = handlerState;

	tween({
		targets: [chara],
		angle: 0,
		duration: 100,
		ease: "Cubic.Out",
	});

	if (!Chara.isShopItem(handlerState.unitId)) {
		SellZone.hide();
	}

	if (!handlerState.wasDragSuccessful) {
		const vec = chara.getData("dragStartVec") as Vec2;
		tween({
			targets: [chara],
			...vec,
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

	const dragStartVec = Geometry.vec2(chara.x, chara.y);
	chara.setData("dragStartVec", dragStartVec);

	handlerState.wasDragSuccessful = false;

	if (handlerState.longPressTimer) {
		handlerState.longPressTimer.destroy();
		handlerState.longPressTimer = undefined;
	}
	handlerState.isLongPressActive = false;

	if (Chara.isShopItem(handlerState.unitId)) {
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

	if (!Chara.isShopItem(handlerState.unitId)) {
		SellZone.show();
	}

	Tooltip.hideTooltip();
};

const handleDropShopItem = (chara: Chara.Chara) => (tile: Vec2) => {
	const vec = chara.getData("dragStartVec") as Vec2;
	Shop.events.itemDragPurchaseRequested({ ...Chara.getUnit(chara) }, Chara.getUnit(chara).id, tile, vec.x, vec.y);
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
		movementRejected(unitId, dragStartX, dragStartY, "UNIT_NOT_FOUND");
		return;
	}

	if (Geometry.eqVec2(unit.position, targetTile)) {
		movementRejected(unitId, dragStartX, dragStartY, "NO_OP");
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

	applyMoveVisual(result.movedUnit);
};

const _executeSwap = (unit: Unit, _occupier: Unit, target: Vec2, units: Unit[]) => {
	const result = Board.updateUnitPosition(unit, target, units);
	if (!result) return;

	applySwapVisual(result.movedUnit, result.swappedUnit!);
};

const applyMoveVisual = (movedUnit: Unit) => {
	const movedChara = Chara.getCharaById(movedUnit.id);
	const pos = Chara.getScreenPosition(movedUnit);

	tween({ targets: [movedChara], ...pos });
};

const applySwapVisual = (movedUnit: Unit, swappedUnit: Unit) => {
	const movedChara = Chara.getCharaById(movedUnit.id);
	const swappedChara = Chara.getCharaById(swappedUnit.id);
	const movedPos = Chara.getScreenPosition(movedUnit);
	const swappedPos = Chara.getScreenPosition(swappedUnit);

	tween({ targets: [movedChara], ...movedPos });
	tween({ targets: [swappedChara], ...swappedPos });
};

const movementRejected = (unitId: string, dragStartX: number, dragStartY: number, _reason: string) => {
	const failedChara = Chara.getCharaById(unitId);
	Tooltip.hideTooltip();

	tween({ targets: [failedChara], ...Geometry.vec2(dragStartX, dragStartY) });
};

export const onPointerDown = (handlerState: InputHandler) => (_pointer: Pointer): void => {

	if (!scene.sys.game.device.input.touch) return;
	handlerState.longPressTimer = scene.time.delayedCall(TOUCH_TOOLTIP_INPUT_DOWN_DELAY, () => {
		handlerState.isLongPressActive = true;
		const { chara } = handlerState;
		onCharaPointerOver(chara);
	});
};

export const onPointerUp = (handlerState: InputHandler) => (_pointer: Pointer): void => {
	if (handlerState.longPressTimer) {
		handlerState.longPressTimer.destroy();
		handlerState.longPressTimer = undefined;
	}

	if (handlerState.isLongPressActive && !Chara.isShopItem(handlerState.unitId)) {
		handlerState.isLongPressActive = false;
		import('./CharaTooltip').then(({ onCharaPointerOut }) => {
			onCharaPointerOut();
		});
	}
};

export const onPointerUpShopItem = (handlerState: InputHandler) => (pointer: Pointer): void => {
	if (!Chara.isShopItem(handlerState.unitId) || !handlerState.chara.input?.enabled) return;

	if (pointer.getDistance() > constants.DRAG_CLICK_THRESHOLD) {
		return;
	}

	// Don't trigger shop click if it was a long press, and snap back to original position
	if (handlerState.isLongPressActive) {
		handlerState.isLongPressActive = false;
		const vec = handlerState.chara.getData("dragStartVec") as Vec2;

		tween({
			targets: [handlerState.chara],
			...vec,
			duration: 150,
		});
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

