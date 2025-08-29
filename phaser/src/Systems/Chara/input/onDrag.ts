import { Chara } from "../Chara";

export const onDrag = (chara: Chara) => (
	_pointer: Pointer,
	dragX: number,
	dragY: number,
): void => {
	chara.x = dragX;
	chara.y = dragY;
};
