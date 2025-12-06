import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { startGame } from "../../../Game/effects/startGame";
import { t } from "@i18n/i18n";

export function newRunButton(y: number) {
	return createUIButton(
		t("title.newRun"),
		vec2(constants.MIDDLE_SCREEN.x, y),
		startGame
	);
}
