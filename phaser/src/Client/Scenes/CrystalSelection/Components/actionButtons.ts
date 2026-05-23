import { createUIButton } from "@Components/UIButton";
import * as constants from "@Constants/constants";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/SharedGeometry";
import * as _ from "../CrystalSelectionScene";
import { returnToTitle } from "../Effects/returnToTitle";
import { startGameWithCrystal } from "../Effects/startGameWithCrystal";

export function actionButtons() {
	createUIButton({
		text: t("crystalSelection.play"),
		position: vec2(constants.MIDDLE_SCREEN_X, _.PLAY_BUTTON_Y),
		callback: startGameWithCrystal,
	});
	createUIButton({
		text: t("crystalSelection.back"),
		position: vec2(constants.MIDDLE_SCREEN_X, _.BACK_BUTTON_Y),
		callback: returnToTitle,
	});
}
