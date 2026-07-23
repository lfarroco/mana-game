import * as UIButton from "@Components/Button/UIButton";
import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as CrystalSelectionScreen from "../CrystalSelectionScreen";

const PLAY_BUTTON_Y = 830;
const BACK_BUTTON_Y = 930;

export function create() {
	UIButton.create({
		text: i18n.t("crystalSelection.play"),
		position: [
			constants.MIDDLE_SCREEN_X,
			PLAY_BUTTON_Y,
		],
		callback: () => CrystalSelectionScreen.events.playClicked.emit(undefined),
	});
	UIButton.create({
		text: i18n.t("crystalSelection.back"),
		position: [
			constants.MIDDLE_SCREEN_X,
			BACK_BUTTON_Y,
		],
		callback: () => CrystalSelectionScreen.events.backClicked.emit(undefined),
	});
}
