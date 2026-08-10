import * as Board from "@Components/Board/Board";
import type * as Chara from "@Components/Chara/Chara";
import * as animation from "@Utils/animation";
import { env } from "@Env";
import { whenDroppedOnZone } from "../../phaser-helpers";

const DRAG_TILT_ANGLE = -10;
const DRAG_TILT_DURATION_MS = 100;
const DRAG_SNAP_DURATION_MS = 150;

export type DragGestureCallbacks = {
	/** Per-zone drop handlers; a drop over any key marks the gesture successful. */
	onDropZone?: Record<string, (zone: Phaser.GameObjects.Zone) => void>;
	/** Extra side effects on drag start (e.g. showing the discard zone). */
	onDragStart?: () => void;
	/** Extra side effects on drag end (e.g. hiding the discard zone). */
	onDragEnd?: () => void;
};

/**
 * Wire the shared chara drag gesture: record the start position, raise the
 * chara and tilt it on drag start, follow the pointer while dragging, and
 * straighten + snap back on drag end when the chara wasn't dropped on a
 * registered zone.
 *
 * A drop over any `onDropZone` key marks the gesture successful synchronously,
 * so the drag-end snap-back is skipped. Callers own their async drop handling
 * (e.g. a rejected purchase snaps the chara back with its own tween).
 */
export function initDragGesture(chara: Chara.Chara, callbacks: DragGestureCallbacks = {}): void {
	let wasDragSuccessful = false;

	env.scene.input.setDraggable(chara, true);

	chara.on(Phaser.Input.Events.DRAG_START, () => {
		if (!Board.isInputEnabled()) return;

		wasDragSuccessful = false;
		chara.setData("dragStartVec", [chara.x, chara.y] as Vec2);
		env.scene.children.bringToTop(chara);
		tilt(chara, DRAG_TILT_ANGLE);
		callbacks.onDragStart?.();
	});

	chara.on(Phaser.Input.Events.DRAG, (_pointer: Pointer, dragX: number, dragY: number) => {
		if (!Board.isInputEnabled()) return;

		chara.x = dragX;
		chara.y = dragY;
	});

	for (const [zoneName, onDrop] of Object.entries(callbacks.onDropZone ?? {})) {
		whenDroppedOnZone(chara, zoneName, (zone) => {
			if (!Board.isInputEnabled()) return;

			onDrop(zone);
			wasDragSuccessful = true;
		});
	}

	chara.on(Phaser.Input.Events.DRAG_END, () => {
		if (!Board.isInputEnabled()) return;

		tilt(chara, 0);
		callbacks.onDragEnd?.();

		if (!wasDragSuccessful) {
			const [x, y] = chara.getData("dragStartVec") as Vec2;
			void animation.tween({
				targets: [chara],
				x,
				y,
				duration: DRAG_SNAP_DURATION_MS,
			});
		}
	});
}

function tilt(chara: Chara.Chara, angle: number): void {
	void animation.tween({
		targets: [chara],
		angle,
		duration: DRAG_TILT_DURATION_MS,
		ease: "Cubic.Out",
	});
}
