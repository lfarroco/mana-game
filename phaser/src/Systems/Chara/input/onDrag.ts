import Phaser from "phaser";
import { CharaInputHandler } from "./CharaInputHandler";

export const onDrag = (handlerState: CharaInputHandler) => (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void => {
	const { chara } = handlerState;
	chara.x = dragX;
	chara.y = dragY;
};
