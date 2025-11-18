import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { startGame } from "../../../Game/effects/startGame";

export function startButton() {
	createUIButton(
		"New Run",
		vec2(constants.MIDDLE_SCREEN.x, constants.MIDDLE_SCREEN.y + 200),
		startGame
	);
}
