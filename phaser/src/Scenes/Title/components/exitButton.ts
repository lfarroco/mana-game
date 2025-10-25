import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";

export function exitButton() {
	createUIButton(
		'EXIT',
		vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + 380),
		() => { window.close(); }
	);
}
