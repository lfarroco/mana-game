import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { openOptions } from "../effects/openOptions";

export function optionsButton(y: number) {
	createUIButton(
		"OPTIONS",
		vec2(constants.MIDDLE_SCREEN_X, y),
		openOptions
	);
}
