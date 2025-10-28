import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { loadGame } from "../../../Game/effects/loadGame";

export function resumeGameButton() {
	createUIButton(
		'Resume',
		vec2(constants.MIDDLE_SCREEN.x, constants.MIDDLE_SCREEN.y),
		loadGame
	);
}

