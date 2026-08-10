import * as CoreConstants from "@game/Constants";
import * as Board from "@Components/Board/Board";
import * as Geometry from "@game/Geometry";
import { Unit } from "@game/Models";
import * as animation from "@Utils/animation";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as Chara from "@Components/Chara/Chara";
import * as CharaTooltip from "@Components/Chara/CharaTooltip";
import * as DiscardZone from "../../Screens/Battleground/Components/Shop/DiscardZone";
import { env } from "@Env";
import { onUnitSold } from "@Screens/Battleground/Phases/Shop/handleShopPhase";
import { initDragGesture } from "./drag";

const TOUCH_TOOLTIP_INPUT_DOWN_DELAY = 200;

export type InputHandler = {
	chara: Chara.Chara;
	unitId: string;
	longPressTimer?: Phaser.Time.TimerEvent;
	isLongPressActive: boolean;
};

export function init(chara: Chara.Chara) {
	const unit = Chara.getUnit(chara);

	const state: InputHandler = {
		chara,
		unitId: unit.id,
		isLongPressActive: false,
	};

	const isPlayerUnit = Chara.getUnit(chara).force === CoreConstants.FORCE_ID_PLAYER;
	const isShopUnit = Chara.mustGetState(chara).isShopChara;

	if (isShopUnit || !isPlayerUnit) {
		return state;
	}

	if (isPlayerUnit) {
		initDragGesture(chara, {
			onDropZone: {
				[DiscardZone.name]: () => {
					void (async () => {
						const { session } = await env.dispatch({ type: "discard_unit", unitId: state.unitId });
						env.updateState({ ...env.state, session });
						// Destroy the chara immediately so it disappears from the board.
						// The shop-phase listener also handles this, but the sale can
						// happen in any phase (e.g. via drag-to-discard outside shop).
						if (Chara.hasCharaById(state.unitId)) {
							Chara.destroy(Chara.mustGetCharaById(state.unitId));
						}
						onUnitSold(state.unitId);
					})();
				},
				"board-cell": (zone) => {
					const x = zone.getData("cell-x") as number;
					const y = zone.getData("cell-y") as number;
					const tile: Vec2 = [x, y];
					const [sx, sy] = chara.getData("dragStartVec") as Vec2;
					processOwnedUnitMoveRequest(state.unitId, tile, sx, sy);
				},
			},
			onDragStart: () => {
				if (state.longPressTimer) {
					state.longPressTimer.destroy();
					state.longPressTimer = undefined;
				}
				state.isLongPressActive = false;

				const unit = Chara.getUnit(chara);
				if (!unit.isCore) {
					DiscardZone.show();
				}
				Tooltip.hideTooltip();
			},
			onDragEnd: () => {
				DiscardZone.hide();
			},
		});

		chara.on(Phaser.Input.Events.POINTER_DOWN, onPointerDown(state));
		chara.on(Phaser.Input.Events.POINTER_UP, onPointerUp(state));
	}

	return state;
}

export const processOwnedUnitMoveRequest = (
	unitId: string,
	targetTile: Vec2,
	dragStartX: number,
	dragStartY: number
) => {
	const units = env.state.session.team.units;
	const unit = units.find((u) => u.id === unitId);

	if (!unit) {
		movementRejected(unitId, dragStartX, dragStartY, "UNIT_NOT_FOUND");
		return;
	}

	if (Geometry.eqVec2(unit.position, targetTile)) {
		movementRejected(unitId, dragStartX, dragStartY, "NO_OP");
		return;
	}

	const occupier = units.find((u) => u.id !== unitId && Geometry.eqVec2(u.position, targetTile));
	if (occupier) {
		executeSwap(unit, occupier, targetTile, units);
		return;
	}

	executeMove(unit, targetTile, units);
};

const saveUnitPositions = (units: Unit[]) => {
	void (async () => {
		const { session } = await env.dispatch({ type: "update_team", team: { units } });
		env.updateState({ ...env.state, session });
	})();
};

const executeMove = (unit: Unit, target: Vec2, units: Unit[]) => {
	const result = Board.updateUnitPosition(unit, target, units);
	if (!result) return;

	applyMoveVisual(result.movedUnit);

	saveUnitPositions(units);
};

const executeSwap = (unit: Unit, _occupier: Unit, target: Vec2, units: Unit[]) => {
	const result = Board.updateUnitPosition(unit, target, units);
	if (!result) return;

	applySwapVisual(result.movedUnit, result.swappedUnit!);

	saveUnitPositions(units);
};

const applyMoveVisual = (movedUnit: Unit) => {
	const movedChara = Chara.mustGetCharaById(movedUnit.id);
	const pos = Chara.getScreenPosition(movedUnit);

	animation.tween({ targets: [movedChara], ...pos });
};

const applySwapVisual = (movedUnit: Unit, swappedUnit: Unit) => {
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

	animation.tween({
		targets: [failedChara],
		x: dragStartX,
		y: dragStartY,
	});
};

export const onPointerDown =
	(handlerState: InputHandler) =>
	(_pointer: Pointer): void => {
		if (!env.scene.sys.game.device.input.touch) return;
		handlerState.longPressTimer = env.scene.time.delayedCall(TOUCH_TOOLTIP_INPUT_DOWN_DELAY, () => {
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
