import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as OptionsScreen from "@Screens/Options/OptionsScreen";
import * as i18n from "@i18n/i18n";

export function create() {
	UIButton.create({
		text: i18n.t("options.back"),
		position: [constants.MIDDLE_SCREEN_X, OptionsScreen.LAYOUT.BACK_BUTTON_Y],
		callback: OptionsScreen.events.backToTitle.emit,
	});
}
