import { createUIButton } from "@Components/UIButton";
import * as constants from "@Constants/constants";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/SharedGeometry";
import * as _ from "../CrystalSelectionScene";
import * as navigateToPrevious from "../Effects/navigateToPrevious";
import * as navigateToNext from "../Effects/navigateToNext";

export function navigationButtons() {
	createUIButton({
		text: t("crystalSelection.previous"),
		position: vec2(constants.MIDDLE_SCREEN_X - _.NAV_BUTTON_OFFSET_X, _.CARD_DISPLAY_Y),
		callback: navigateToPrevious.navigateToPrevious,
		width: _.NAV_BUTTON_WIDTH,
	});

	createUIButton({
		text: t("crystalSelection.next"),
		position: vec2(constants.MIDDLE_SCREEN_X + _.NAV_BUTTON_OFFSET_X, _.CARD_DISPLAY_Y),
		callback: navigateToNext.navigateToNext,
		width: _.NAV_BUTTON_WIDTH,
	});
}
