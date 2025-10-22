import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@UI/UIButton";
import { startGame } from "../effects/startGame";

export function startButton() {
	createUIButton(
		'START GAME',
		vec2(constants.MIDDLE_SCREEN.x, constants.MIDDLE_SCREEN.y + 100),
		startGame
	);
}

