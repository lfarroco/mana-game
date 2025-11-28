import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { loadGame } from "../../../Game/effects/loadGame";
import { getSavedData } from "../../../Game/effects/getSavedData";

export async function resumeGameButton(y: number) {
	const data = await getSavedData();
	if (!data) return;

	createUIButton(
		"RESUME",
		vec2(constants.MIDDLE_SCREEN.x, y),
		loadGame
	);
}
