import * as constants from "@Constants/constants";
import * as Geometry from "@Models/Geometry";
import * as UIButton from "@Components/UIButton";
import * as Effects from "../Effects";
import * as i18n from "@i18n/i18n";

export function newSinglePlayerRunButton(y: number) {
	return UIButton.createUIButton({
		text: i18n.t("title.newRun"),
		position: Geometry.vec2(constants.MIDDLE_SCREEN.x, y),
		callback: () => Effects.startGame({ isMultiplayer: false }),
	});
}
