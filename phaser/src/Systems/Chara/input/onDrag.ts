import Phaser from "phaser";
import { InputHandler } from ".";

export const onDrag = (handlerState: InputHandler) => (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void => {
	const { chara } = handlerState;
	chara.x = dragX;
	chara.y = dragY;
};
