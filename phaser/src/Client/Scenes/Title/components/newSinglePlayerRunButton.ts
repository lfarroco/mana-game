import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { startGame } from "@Game/effects/startGame";
import { t } from "@i18n/i18n";

export function newSinglePlayerRunButton(y: number) {
	return createUIButton({
		text: t("title.newRun"),
		position: vec2(constants.MIDDLE_SCREEN.x, y),
		callback: () => startGame(false),
	});
}
