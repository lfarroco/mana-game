import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { openOptions } from "../effects/openOptions";

export function optionsButton() {
	createUIButton(
		'OPTIONS',
		vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + 400),
		openOptions
	);
}
