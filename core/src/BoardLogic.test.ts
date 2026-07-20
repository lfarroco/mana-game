/// <reference types="jest" />

import * as BoardLogic from "./BoardLogic";
import * as Models from "./Models";

function makeUnit(id: string, force: string, pos: [number, number], isCore = false): Models.Unit {
	return {
		id,
		cardId: "test",
		pic: "test",
		force,
		position: pos,
		power: 10,
		cooldown: 1000,
		evade: 0,
		rank: 1,
		effects: [],
		reactions: [],
		charge: 0,
		refresh: 0,
		hasted: 0,
		slowed: 0,
		isCore,
		life: 100,
		maxLife: 100,
		critical: 0,
		shield: 0,
		bonusPower: 0,
	};
}

describe("BoardLogic", () => {
	describe("getEmptySlot", () => {
		it("returns [0,0] for empty board", () => {
			const slot = BoardLogic.getEmptySlot([], "A");
			expect(slot).toEqual([0, 0]);
		});

		it("returns next empty slot when some are occupied", () => {
			const units = [makeUnit("1", "A", [0, 0]), makeUnit("2", "A", [1, 0])];
			const slot = BoardLogic.getEmptySlot(units, "A");
			expect(slot).toEqual([2, 0]);
		});

		it("returns null when board is full for a force", () => {
			const units: Models.Unit[] = [];
			for (let y = 0; y < 3; y++) {
				for (let x = 0; x < 3; x++) {
					units.push(makeUnit(`a${x}${y}`, "A", [x, y]));
				}
			}
			const slot = BoardLogic.getEmptySlot(units, "A");
			expect(slot).toBeNull();
		});

		it("ignores units from other forces", () => {
			const units = [
				makeUnit("1", "B", [0, 0]),
				makeUnit("2", "B", [0, 1]),
			];
			const slot = BoardLogic.getEmptySlot(units, "A");
			expect(slot).toEqual([0, 0]);
		});
	});

	describe("findFreeSlot", () => {
		it("returns preferred position when free", () => {
			const units = [makeUnit("1", "A", [0, 0])];
			const slot = BoardLogic.findFreeSlot(units, "A", [1, 1]);
			expect(slot).toEqual([1, 1]);
		});

		it("returns another slot when preferred is occupied", () => {
			const units = [
				makeUnit("1", "A", [1, 1]),
				makeUnit("2", "A", [0, 0]),
			];
			const slot = BoardLogic.findFreeSlot(units, "A", [1, 1]);
			expect(slot).toEqual([1, 0]);
		});

		it("returns first empty when no preference given", () => {
			const units = [makeUnit("1", "A", [0, 0])];
			const slot = BoardLogic.findFreeSlot(units, "A");
			expect(slot).toEqual([1, 0]);
		});

		it("returns null when board is full", () => {
			const units: Models.Unit[] = [];
			for (let y = 0; y < 3; y++) {
				for (let x = 0; x < 3; x++) {
					units.push(makeUnit(`a${x}${y}`, "A", [x, y]));
				}
			}
			const slot = BoardLogic.findFreeSlot(units, "A", [0, 0]);
			expect(slot).toBeNull();
		});
	});

	describe("checkMove", () => {
		it("returns invalid when moving to same position", () => {
			const unit = makeUnit("1", "A", [0, 0]);
			const result = BoardLogic.checkMove(unit, [0, 0], [unit]);
			expect(result.valid).toBe(false);
		});

		it("returns valid with no occupant for empty slot", () => {
			const unit = makeUnit("1", "A", [0, 0]);
			const result = BoardLogic.checkMove(unit, [1, 1], [unit]);
			expect(result.valid).toBe(true);
			expect(result.occupant).toBeUndefined();
		});

		it("returns valid with occupant when slot is occupied", () => {
			const unit1 = makeUnit("1", "A", [0, 0]);
			const unit2 = makeUnit("2", "A", [1, 1]);
			const result = BoardLogic.checkMove(unit1, [1, 1], [unit1, unit2]);
			expect(result.valid).toBe(true);
			expect(result.occupant).toBe(unit2);
		});
	});

	describe("createGrid", () => {
		it("returns a 3x3 zero matrix", () => {
			const grid = BoardLogic.createGrid();
			expect(grid).toHaveLength(3);
			expect(grid[0]).toEqual([0, 0, 0]);
			expect(grid[1]).toEqual([0, 0, 0]);
			expect(grid[2]).toEqual([0, 0, 0]);
		});
	});
});
