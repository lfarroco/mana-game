import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { startGame } from "../../../Game/effects/startGame";

export function startButton(y: number) {
	createUIButton(
		"NEW RUN",
		vec2(constants.MIDDLE_SCREEN.x, y),
		startGame
	);
}
