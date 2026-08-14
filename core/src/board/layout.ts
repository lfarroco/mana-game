import { Unit } from "../Models";
import * as geom from "../math/Geometry";
import type { Vec2 } from "../math/Geometry";

export const BOARD_COLS = 3;
export const BOARD_ROWS = 3;

export type BoardLayout = {
  x: number;
  y: number;
  tileWidth: number;
  tileHeight: number;
  slotSpacing: number;
  cols: number;
  rows: number;
};

export const boardWidth = (layout: BoardLayout): number =>
  layout.cols * layout.tileWidth + (layout.cols - 1) * layout.slotSpacing;

export const boardHeight = (layout: BoardLayout): number =>
  layout.rows * layout.tileHeight + (layout.rows - 1) * layout.slotSpacing;

/** Converts a row-major slot index (tileY outer loop, tileX inner) to a cell, or null when out of range. */
export const slotIndexToCell = (
  slotIndex: number,
  cols = BOARD_COLS,
  rows = BOARD_ROWS,
): Vec2 | null => {
  if (slotIndex < 0 || slotIndex >= cols * rows) return null;
  return [slotIndex % cols, Math.floor(slotIndex / cols)];
};

/** Maps a pointer position to the board cell under it, or null when outside the board. */
export const pointerToCell = (
  layout: BoardLayout,
  pointer: { x: number; y: number },
): Vec2 | null => {
  const tileWithSpacing = layout.tileWidth + layout.slotSpacing;
  const heightWithSpacing = layout.tileHeight + layout.slotSpacing;

  if (
    pointer.x >= layout.x &&
    pointer.x < layout.x + boardWidth(layout) &&
    pointer.y >= layout.y &&
    pointer.y < layout.y + boardHeight(layout)
  ) {
    const tileX = Math.floor((pointer.x - layout.x) / tileWithSpacing);
    const tileY = Math.floor((pointer.y - layout.y) / heightWithSpacing);

    if (
      tileX >= 0 &&
      tileX < layout.cols &&
      tileY >= 0 &&
      tileY < layout.rows
    ) {
      return [tileX, tileY];
    }
  }
  return null;
};

/** Returns the centered slot position for a cell; flipX mirrors horizontally (enemy board). */
export const cellToSlotPosition = (
  layout: BoardLayout,
  cell: Vec2,
  flipX = false,
): Vec2 => {
  const visualX = flipX ? layout.cols - 1 - cell[0] : cell[0];
  const zoneX = layout.x + visualX * (layout.tileWidth + layout.slotSpacing);
  const zoneY = layout.y + cell[1] * (layout.tileHeight + layout.slotSpacing);

  return [zoneX + layout.tileWidth / 2, zoneY + layout.tileHeight / 2];
};

export const getUnitAt =
  (units: Unit[]) =>
  (position: Vec2): Unit | undefined =>
    units.find((u) => geom.eqVec2(u.position, position));
