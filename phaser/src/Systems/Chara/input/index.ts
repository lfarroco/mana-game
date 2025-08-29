import { FORCE_ID_PLAYER } from "../../../constants/constants";
import { Vec2, vec2 } from "@Models/Geometry.pure";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { Chara, getUnit, getIsShopItem } from "../Chara";
import { onDrag } from "./onDrag";
import { onDragEnd } from "./onDragEnd";
import { onDragStart } from "./onDragStart";
import { onDrop } from "./onDrop";
import { onPointerUpShopItem } from "./onPointerUpShopItem";

export type InputHandler = {
	dragStartX: number;
	dragStartY: number;
	dragStartVec: Vec2;
	wasDragSuccessful: boolean;
	chara: Chara;
	unitId: string;
};

export function init(chara: Chara) {

	const state: InputHandler = {
		dragStartX: 0,
		dragStartY: 0,
		dragStartVec: vec2(0, 0),
		wasDragSuccessful: false,
		chara,
		unitId: getUnit(chara).id
	};

	if (getUnit(chara).force === FORCE_ID_PLAYER || getIsShopItem(state.unitId)) {
		scene.input.setDraggable(chara, true);

		chara.on(Phaser.Input.Events.DRAG_START, onDragStart(state));
		chara.on(Phaser.Input.Events.DRAG, onDrag(chara));
		chara.on(Phaser.Input.Events.DROP, onDrop(state));
		chara.on(Phaser.Input.Events.DRAG_END, onDragEnd(state));

		if (getIsShopItem(state.unitId)) {
			chara.on(Phaser.Input.Events.POINTER_UP, onPointerUpShopItem(state));
		}
	}

	return state;
}