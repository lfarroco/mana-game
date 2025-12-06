import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { loadGame } from "../../../Game/effects/loadGame";
import { getSavedData } from "../../../Game/effects/getSavedData";
import { t } from "@i18n/i18n";

export function resumeGameButton(y: number) {
	const data = getSavedData();
	if (!data) return;

	return createUIButton(
		t("title.resume"),
		vec2(constants.MIDDLE_SCREEN.x, y),
		loadGame
	);
}
