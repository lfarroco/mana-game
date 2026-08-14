/// <reference types="jest" />

import {
  boardHeight,
  boardWidth,
  cellToSlotPosition,
  pointerToCell,
  slotIndexToCell,
} from "./layout";

describe("BoardLayout", () => {
  const layout = {
    x: 120,
    y: 105,
    tileWidth: 250,
    tileHeight: 250,
    slotSpacing: 8,
    cols: 3,
    rows: 3,
  };

  describe("boardWidth / boardHeight", () => {
    it("computes the total board size including spacing", () => {
      expect(boardWidth(layout)).toBe(766);
      expect(boardHeight(layout)).toBe(766);
    });
  });

  describe("slotIndexToCell", () => {
    it("converts row-major slot indices to cells", () => {
      expect(slotIndexToCell(0)).toEqual([0, 0]);
      expect(slotIndexToCell(2)).toEqual([2, 0]);
      expect(slotIndexToCell(3)).toEqual([0, 1]);
      expect(slotIndexToCell(4)).toEqual([1, 1]);
      expect(slotIndexToCell(8)).toEqual([2, 2]);
    });

    it("returns null for out-of-range indices", () => {
      expect(slotIndexToCell(9)).toBeNull();
      expect(slotIndexToCell(-1)).toBeNull();
    });
  });

  describe("pointerToCell", () => {
    it("maps a pointer inside the first tile to cell [0, 0]", () => {
      expect(pointerToCell(layout, { x: 150, y: 130 })).toEqual([0, 0]);
    });

    it("maps a pointer in the second column to cell [1, 0]", () => {
      expect(pointerToCell(layout, { x: 388, y: 115 })).toEqual([1, 0]);
    });

    it("returns null for pointers outside the board", () => {
      expect(pointerToCell(layout, { x: 100, y: 130 })).toBeNull();
      expect(pointerToCell(layout, { x: 900, y: 130 })).toBeNull();
      expect(pointerToCell(layout, { x: 150, y: 50 })).toBeNull();
      expect(pointerToCell(layout, { x: 150, y: 900 })).toBeNull();
    });
  });

  describe("cellToSlotPosition", () => {
    it("returns the centered slot position for a cell", () => {
      expect(cellToSlotPosition(layout, [0, 0])).toEqual([245, 230]);
      expect(cellToSlotPosition(layout, [1, 0])).toEqual([503, 230]);
    });

    it("mirrors the x axis when flipX is set", () => {
      expect(cellToSlotPosition(layout, [0, 0], true)).toEqual([761, 230]);
      expect(cellToSlotPosition(layout, [1, 0], true)).toEqual([503, 230]);
    });
  });
});
