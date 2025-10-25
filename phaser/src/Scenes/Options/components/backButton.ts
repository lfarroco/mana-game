import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { LAYOUT } from "../OptionsScene";
import { returnToTitle } from "../effects/returnToTitle";

export function backButton() {
	createUIButton(
		'BACK',
		vec2(constants.MIDDLE_SCREEN_X, LAYOUT.BACK_BUTTON_Y),
		returnToTitle
	);
}
