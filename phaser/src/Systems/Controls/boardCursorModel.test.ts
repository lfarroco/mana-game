import {
	clearBoardSelection,
	createInitialBoardCursorState,
	moveBoardCursor,
	resolveBoardConfirm,
} from "@Systems/Controls/boardCursorModel";
import { makeUnit } from "@Models/Entities/Unit";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "@Constants/constants";

describe("boardCursorModel", () => {
	it("starts on the first player unit when available", () => {
		const units = [
			makeUnit(FORCE_ID_PLAYER, "core", { x: 1, y: 1 }),
			makeUnit(FORCE_ID_PLAYER, "hero", { x: 0, y: 2 }),
		];

		expect(createInitialBoardCursorState(units)).toEqual({
			cursor: { x: 1, y: 1 },
			selectedUnitId: null,
		});
	});

	it("clamps movement to the 3x3 board", () => {
		const state = { cursor: { x: 0, y: 0 }, selectedUnitId: null };

		expect(moveBoardCursor(state, "left")).toEqual(state);
		expect(moveBoardCursor(state, "up")).toEqual(state);
		expect(moveBoardCursor(state, "right")).toEqual({
			cursor: { x: 1, y: 0 },
			selectedUnitId: null,
		});
	});

	it("selects a hovered player unit before issuing a move", () => {
		const unit = makeUnit(FORCE_ID_PLAYER, "core", { x: 1, y: 1 });
		const initial = { cursor: { x: 1, y: 1 }, selectedUnitId: null };

		const selected = resolveBoardConfirm(initial, [unit]);
		expect(selected).toEqual({
			nextState: {
				cursor: { x: 1, y: 1 },
				selectedUnitId: unit.id,
			},
		});

		const moved = resolveBoardConfirm(
			{ cursor: { x: 2, y: 1 }, selectedUnitId: unit.id },
			[unit]
		);
		expect(moved).toEqual({
			nextState: {
				cursor: { x: 2, y: 1 },
				selectedUnitId: null,
			},
			move: {
				unitId: unit.id,
				from: { x: 1, y: 1 },
				to: { x: 2, y: 1 },
			},
		});
	});

	it("ignores non-player units and clears selection", () => {
		const enemy = makeUnit(FORCE_ID_CPU, "enemy", { x: 1, y: 1 });
		const result = resolveBoardConfirm({ cursor: { x: 1, y: 1 }, selectedUnitId: null }, [enemy]);
		expect(result).toEqual({
			nextState: {
				cursor: { x: 1, y: 1 },
				selectedUnitId: null,
			},
		});

		expect(clearBoardSelection({ cursor: { x: 0, y: 0 }, selectedUnitId: "u" })).toEqual({
			cursor: { x: 0, y: 0 },
			selectedUnitId: null,
		});
	});
});