import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { startGame } from "../../../Game/effects/startGame";

export function newRunButton(y: number) {
	return createUIButton(
		"NEW RUN",
		vec2(constants.MIDDLE_SCREEN.x, y),
		startGame
	);
}
