import Phaser from "phaser";
import { Chara } from "../Chara";

export const onDrag = (chara: Chara) => (
	_pointer: Phaser.Input.Pointer,
	dragX: number,
	dragY: number,
): void => {
	chara.x = dragX;
	chara.y = dragY;
};
