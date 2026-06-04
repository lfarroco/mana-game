import * as constants from "@Constants/constants";
import * as Geometry from "@Models/Geometry";
import * as UIButton from "Client/Components/UIButton";
import * as OptionsScreen from "@Screens/Options/OptionsScreen";
import * as returnToTitle from "@Screens/Options/Effects/returnToTitle";
import * as i18n from "@i18n/i18n";

export function create() {
	UIButton.createUIButton({
		text: i18n.t("options.back"),
		position: Geometry.vec2(constants.MIDDLE_SCREEN_X, OptionsScreen.LAYOUT.BACK_BUTTON_Y),
		callback: returnToTitle.returnToTitle,
	});
}
