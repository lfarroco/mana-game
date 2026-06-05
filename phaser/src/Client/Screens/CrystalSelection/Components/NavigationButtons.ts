import * as UIButton from "Client/Components/UIButton";
import * as constants from "@Constants/constants";
import * as i18n from "@i18n/i18n";
import * as Geometry from "@Models/Geometry";
import * as navigateToPrevious from "../Effects/navigateToPrevious";
import * as navigateToNext from "../Effects/navigateToNext";
import * as bg from "./Background"

const NAV_BUTTON_OFFSET_X = 350;
const NAV_BUTTON_WIDTH = 200;

export function create() {
	UIButton.create({
		text: i18n.t("crystalSelection.previous"),
		position: Geometry.vec2(
			constants.MIDDLE_SCREEN_X - NAV_BUTTON_OFFSET_X, bg.CARD_DISPLAY_Y),
		callback: navigateToPrevious.navigateToPrevious,
		width: NAV_BUTTON_WIDTH,
	});

	UIButton.create({
		text: i18n.t("crystalSelection.next"),
		position: Geometry.vec2(constants.MIDDLE_SCREEN_X + NAV_BUTTON_OFFSET_X, bg.CARD_DISPLAY_Y),
		callback: navigateToNext.navigateToNext,
		width: NAV_BUTTON_WIDTH,
	});
}
