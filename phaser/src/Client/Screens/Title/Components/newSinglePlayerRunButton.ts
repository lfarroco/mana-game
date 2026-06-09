import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as Effects from "../Effects";
import * as i18n from "@i18n/i18n";

export function render(y: number) {
	return UIButton.create({
		text: i18n.t("title.newRun"),
		position: [constants.MIDDLE_SCREEN_X, y],
		callback: () => Effects.startGame({ isMultiplayer: false }),
	});
}
