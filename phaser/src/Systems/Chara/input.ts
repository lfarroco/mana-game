import * as constants from "@Constants/constants";
import * as GameController from "@Core/GameController";
import * as Board from "@Models/Board";
import * as Geometry from "@Models/Geometry";
import * as Unit from "@Models/Entities/Unit";
import * as animation from "@Utils/animation";
import * as Tooltip from "Client/Components/Tooltip";
import * as Chara from "@Systems/Chara/Chara";
import * as events from "@Systems/Chara/events";
import * as CharaTooltip from "@Systems/Chara/CharaTooltip";
import * as DiscardZone from "@Screens/Battleground/Shop/DiscardZone";

const TOUCH_TOOLTIP_INPUT_DOWN_DELAY = 200;

export type InputHandler = {
	wasDragSuccessful: boolean;
	chara: Chara.Chara;
	unitId: string;
	longPressTimer?: Phaser.Time.TimerEvent;
	isLongPressActive: boolean;
};

export function init(chara: Chara.Chara) {
	const unit = Chara.getUnit(chara);

	const state: InputHandler = {
		wasDragSuccessful: false,
		chara,
		unitId: unit.id,
		isLongPressActive: false,
	};

	const isPlayerUnit = Chara.getUnit(chara).force === constants.FORCE_ID_PLAYER;
	const isShopUnit = Chara.mustGetState(chara).isShopChara;

	if (isShopUnit || !isPlayerUnit) {
		return state;
	}

	if (isPlayerUnit) {
		io.scene.input.setDraggable(chara, true);

		chara.on(Phaser.Input.Events.DRAG_START, onDragStart(state));
		chara.on(Phaser.Input.Events.DRAG, onDrag(chara));

		io.WhenDroppedOnZone(chara, DiscardZone.name, () => {
			if (!Board.isInputEnabled()) return;
			if (isPlayerUnit) events.onDiscard(state.unitId);
		});

		io.WhenDroppedOnZone(chara, "board-cell", (zone) => {
			if (!Board.isInputEnabled()) return;

			const x = zone.getData("cell-x") as number;
			const y = zone.getData("cell-y") as number;
			const tile = Geometry.vec2(x, y);
			const vec = chara.getData("dragStartVec");
			processOwnedUnitMoveRequest(state.unitId, tile, vec.x, vec.y);
			state.wasDragSuccessful = true;
		});

		chara.on(Phaser.Input.Events.DRAG_END, onDragEnd(state));

		chara.on(Phaser.Input.Events.POINTER_DOWN, onPointerDown(state));
		chara.on(Phaser.Input.Events.POINTER_UP, onPointerUp(state));
	}

	return state;
}

export const onDrag =
	(chara: Chara.Chara) =>
		(_pointer: Pointer, dragX: number, dragY: number): void => {
			if (!Board.isInputEnabled()) return;
			chara.x = dragX;
			chara.y = dragY;
		};

export const onDragEnd = (handlerState: InputHandler) => (_pointer: Pointer) => {
	if (!Board.isInputEnabled()) return;

	const { chara } = handlerState;

	animation.tween({
		targets: [chara],
		angle: 0,
		duration: 100,
		ease: "Cubic.Out",
	});

	DiscardZone.hide();

	if (!handlerState.wasDragSuccessful) {
		const vec = chara.getData("dragStartVec") as Vec2;
		animation.tween({
			targets: [chara],
			...vec,
			duration: 150,
		});
	}

	handlerState.wasDragSuccessful = false;
};

export const onDragStart =
	(handlerState: InputHandler) => (_pointer: Pointer, _dragX: number, _dragY: number) => {
		if (!Board.isInputEnabled()) return;

		const { chara } = handlerState;

		const dragStartVec = Geometry.vec2(chara.x, chara.y);
		chara.setData("dragStartVec", dragStartVec);

		handlerState.wasDragSuccessful = false;

		if (handlerState.longPressTimer) {
			handlerState.longPressTimer.destroy();
			handlerState.longPressTimer = undefined;
		}
		handlerState.isLongPressActive = false;

		io.scene.children.bringToTop(chara);

		animation.tween({
			targets: [chara],
			angle: -10,
			duration: 100,
			ease: "Cubic.Out",
		});

		const unit = Chara.getUnit(chara);

		if (!unit.isCore) {
			DiscardZone.show();
		}

		Tooltip.hideTooltip();
	};

export const processOwnedUnitMoveRequest = (
	unitId: string,
	targetTile: Vec2,
	dragStartX: number,
	dragStartY: number
) => {
	const units = state.session.team.units;
	const unit = units.find((u) => u.id === unitId);

	if (!unit) {
		movementRejected(unitId, dragStartX, dragStartY, "UNIT_NOT_FOUND");
		return;
	}

	if (Geometry.eqVec2(unit.position, targetTile)) {
		movementRejected(unitId, dragStartX, dragStartY, "NO_OP");
		return;
	}

	const occupier = units.find(
		(u) => u.id !== unitId && u.position.x === targetTile.x && u.position.y === targetTile.y
	);
	if (occupier) {
		_executeSwap(unit, occupier, targetTile, units);
		return;
	}

	_executeMove(unit, targetTile, units);
};

const saveUnitPositions = (units: Unit.Unit[]) => {
	GameController.updateTeam({ units });
};

const _executeMove = (unit: Unit.Unit, target: Vec2, units: Unit.Unit[]) => {
	const result = Board.updateUnitPosition(unit, target, units);
	if (!result) return;

	applyMoveVisual(result.movedUnit);

	saveUnitPositions(units);
};

const _executeSwap = (unit: Unit.Unit, _occupier: Unit.Unit, target: Vec2, units: Unit.Unit[]) => {
	const result = Board.updateUnitPosition(unit, target, units);
	if (!result) return;

	applySwapVisual(result.movedUnit, result.swappedUnit!);

	saveUnitPositions(units);
};

const applyMoveVisual = (movedUnit: Unit.Unit) => {
	const movedChara = Chara.mustGetCharaById(movedUnit.id);
	const pos = Chara.getScreenPosition(movedUnit);

	animation.tween({ targets: [movedChara], ...pos });
};

const applySwapVisual = (movedUnit: Unit.Unit, swappedUnit: Unit.Unit) => {
	const movedChara = Chara.mustGetCharaById(movedUnit.id);
	const swappedChara = Chara.mustGetCharaById(swappedUnit.id);
	const movedPos = Chara.getScreenPosition(movedUnit);
	const swappedPos = Chara.getScreenPosition(swappedUnit);

	animation.tween({ targets: [movedChara], ...movedPos });
	animation.tween({ targets: [swappedChara], ...swappedPos });
};

const movementRejected = (
	unitId: string,
	dragStartX: number,
	dragStartY: number,
	_reason: string
) => {
	const failedChara = Chara.mustGetCharaById(unitId);
	Tooltip.hideTooltip();

	animation.tween({ targets: [failedChara], ...Geometry.vec2(dragStartX, dragStartY) });
};

export const onPointerDown =
	(handlerState: InputHandler) =>
		(_pointer: Pointer): void => {
			if (!io.scene.sys.game.device.input.touch) return;
			handlerState.longPressTimer = io.scene.time.delayedCall(TOUCH_TOOLTIP_INPUT_DOWN_DELAY, () => {
				handlerState.isLongPressActive = true;
				const { chara } = handlerState;
				CharaTooltip.onCharaPointerOver(chara);
			});
		};

export const onPointerUp =
	(handlerState: InputHandler) =>
		(_pointer: Pointer): void => {
			if (handlerState.longPressTimer) {
				handlerState.longPressTimer.destroy();
				handlerState.longPressTimer = undefined;
			}

			if (handlerState.isLongPressActive) {
				handlerState.isLongPressActive = false;

				CharaTooltip.onCharaPointerOut();
			}
		};
