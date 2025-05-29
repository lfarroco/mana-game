// Drag-and-drop handlers for Guild UI
import * as constants from "../constants";
import { getBenchSlotPosition } from "./GuildRenderHelpers";
import { Chara } from "../../../Systems/Chara/Chara";
import { sellImage } from "./Guild";
import { overlapsWithPlayerBoard } from "../../../Models/Board";


function isSelling(chara: Chara, pointer: Pointer): boolean {
	return (
		pointer.getDistance() > 10 &&
		Phaser.Geom.Intersects.RectangleToRectangle(
			chara.container.getBounds(),
			sellImage!.getBounds()
		)
	);
}

function getDropBenchSlot(pointer: Pointer): number | undefined {
	return [0, 1, 2].find((slotIdx) => {
		const { x: slotX, y: slotY } = getBenchSlotPosition(slotIdx);
		const w = constants.TILE_WIDTH + 20;
		const h = constants.TILE_HEIGHT + 20;
		return (
			pointer.x >= slotX && pointer.x <= slotX + w &&
			pointer.y >= slotY && pointer.y <= slotY + h
		);
	});
}

export function handleUnitDrop(
	chara: Chara,
	pointer: Pointer,
): void | { type: "benchSlot"; index: number } | "sell" | "noop" | "dropped-in-board" | "not-bench-or-board" {
	const wasDrag = pointer.getDistance() > 10;
	const inBoard = overlapsWithPlayerBoard(pointer);

	if (isSelling(chara, pointer)) {
		return "sell";
	}

	const dropBenchSlot = getDropBenchSlot(pointer);
	if (wasDrag && dropBenchSlot !== undefined) {
		return { type: "benchSlot", index: dropBenchSlot };
	}

	if (wasDrag && !inBoard) {
		return "not-bench-or-board";
	}

	if (wasDrag && inBoard) {
		return "dropped-in-board"
	}

	return 'noop';

}
