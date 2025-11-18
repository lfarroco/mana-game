import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { loadGame } from "../../../Game/effects/loadGame";
import { getSavedData } from "../../../Game/effects/getSavedData";

export function resumeGameButton() {
	const data = getSavedData();
	if (!data) return;

	createUIButton(
		"Resume",
		vec2(constants.MIDDLE_SCREEN.x, constants.MIDDLE_SCREEN.y + 100),
		loadGame
	);
}
