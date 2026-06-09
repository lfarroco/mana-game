import * as UIButton from "@Components/Button/UIButton";
import * as Constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as navigateToPrevious from "../Effects/navigateToPrevious";
import * as navigateToNext from "../Effects/navigateToNext";
import * as bg from "./Background"

const NAV_BUTTON_OFFSET_X = 350;
const NAV_BUTTON_WIDTH = 200;

export function create() {
	UIButton.create({
		text: i18n.t("crystalSelection.previous"),
		position: [
			Constants.MIDDLE_SCREEN_X - NAV_BUTTON_OFFSET_X,
			bg.CARD_DISPLAY_Y
		],
		callback: navigateToPrevious.navigateToPrevious,
		width: NAV_BUTTON_WIDTH,
	});

	UIButton.create({
		text: i18n.t("crystalSelection.next"),
		position: [
			Constants.MIDDLE_SCREEN_X + NAV_BUTTON_OFFSET_X,
			bg.CARD_DISPLAY_Y,
		],
		callback: navigateToNext.navigateToNext,
		width: NAV_BUTTON_WIDTH,
	});
}
