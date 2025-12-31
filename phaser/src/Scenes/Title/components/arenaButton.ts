import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { startGame } from "../../../Game/effects/startGame";


export function arenaButton(y: number) {
	return createUIButton(
		"Arena", // TODO: Add translation t("title.arena")
		vec2(constants.MIDDLE_SCREEN.x, y),
		() => startGame({ isArena: true })
	);
}
