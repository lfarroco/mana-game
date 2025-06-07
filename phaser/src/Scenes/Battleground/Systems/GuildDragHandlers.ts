// Drag-and-drop handlers for Guild UI
import { Chara } from "../../../Systems/Chara/Chara";
import { sellImage } from "./Guild";
import { overlapsWithPlayerBoard } from "../../../Models/Board";


function isSelling(chara: Chara, pointer: Pointer): boolean {
	return (
		pointer.getDistance() > 10 &&
		Phaser.Geom.Intersects.RectangleToRectangle(
			chara.getBounds(),
			sellImage!.getBounds()
		)
	);
}

export function handleUnitDrop(
	chara: Chara,
	pointer: Pointer,
): void | "sell" | "noop" | "dropped-in-board" | "not-on-board" {
	const wasDrag = pointer.getDistance() > 10;
	const inBoard = overlapsWithPlayerBoard(pointer);

	if (isSelling(chara, pointer)) {
		return "sell";
	}

	if (wasDrag && !inBoard) {
		return "not-on-board";
	}

	if (wasDrag && inBoard) {
		return "dropped-in-board"
	}

	return 'noop';

}
