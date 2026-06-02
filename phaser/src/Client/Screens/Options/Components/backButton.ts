import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { LAYOUT } from "@Screens/Options/OptionsScreen";
import { returnToTitle } from "@Screens/Options/Effects/returnToTitle";
import { t } from "@i18n/i18n";

export function backButton() {
	createUIButton({
		text: t("options.back"),
		position: vec2(constants.MIDDLE_SCREEN_X, LAYOUT.BACK_BUTTON_Y),
		callback: returnToTitle,
	});
}
