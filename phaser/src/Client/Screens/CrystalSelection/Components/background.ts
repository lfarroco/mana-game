import * as constants from "../../../../Constants";
import * as io from "../../../../io";

export const CARD_DISPLAY_Y = 400;
export const CARD_DISPLAY_BG_WIDTH = 1200;
export const CARD_DISPLAY_BG_HEIGHT = 700;
export const CARD_DISPLAY_BG_COLOR = 0x000000;
export const CARD_DISPLAY_BG_ALPHA = 0.8;

export function create() {
	return io.scene.add.rectangle(
		constants.MIDDLE_SCREEN_X,
		CARD_DISPLAY_Y,
		CARD_DISPLAY_BG_WIDTH,
		CARD_DISPLAY_BG_HEIGHT,
		CARD_DISPLAY_BG_COLOR,
		CARD_DISPLAY_BG_ALPHA
	);
}
