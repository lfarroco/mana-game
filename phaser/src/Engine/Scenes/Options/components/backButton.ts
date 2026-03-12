import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { LAYOUT } from "@Scenes/Options/OptionsScene";
import { returnToTitle } from "@Scenes/Options/effects/returnToTitle";
import { t } from "@i18n/i18n";

export function backButton() {
	createUIButton(
		t("options.back"),
		vec2(constants.MIDDLE_SCREEN_X, LAYOUT.BACK_BUTTON_Y),
		returnToTitle
	);
}
