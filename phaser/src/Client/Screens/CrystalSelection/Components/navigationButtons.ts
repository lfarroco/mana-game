import { createUIButton } from "Client/Components/UIButton";
import * as constants from "@Constants/constants";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/SharedGeometry";
import * as _ from "../CrystalSelectionScene";
import * as navigateToPrevious from "../Effects/navigateToPrevious";
import * as navigateToNext from "../Effects/navigateToNext";
import * as bg from "./background"

const NAV_BUTTON_OFFSET_X = 350;
const NAV_BUTTON_WIDTH = 200;

export function navigationButtons() {
	createUIButton({
		text: t("crystalSelection.previous"),
		position: vec2(constants.MIDDLE_SCREEN_X - NAV_BUTTON_OFFSET_X, bg.CARD_DISPLAY_Y),
		callback: navigateToPrevious.navigateToPrevious,
		width: NAV_BUTTON_WIDTH,
	});

	createUIButton({
		text: t("crystalSelection.next"),
		position: vec2(constants.MIDDLE_SCREEN_X + NAV_BUTTON_OFFSET_X, bg.CARD_DISPLAY_Y),
		callback: navigateToNext.navigateToNext,
		width: NAV_BUTTON_WIDTH,
	});
}
