import * as UIButton from "Client/Components/UIButton";
import * as constants from "@Constants/constants";
import * as i18n from "@i18n/i18n";
import * as SharedGeometry from "@Models/SharedGeometry";
import * as _ from "../CrystalSelectionScene";
import * as Effects from "../Effects";

const PLAY_BUTTON_Y = 830;
const BACK_BUTTON_Y = 930;

export function create() {
	UIButton.create({
		text: i18n.t("crystalSelection.play"),
		position: SharedGeometry.vec2(constants.MIDDLE_SCREEN_X, PLAY_BUTTON_Y),
		callback: Effects.startNewGame,
	});
	UIButton.create({
		text: i18n.t("crystalSelection.back"),
		position: SharedGeometry.vec2(constants.MIDDLE_SCREEN_X, BACK_BUTTON_Y),
		callback: Effects.returnToTitle,
	});
}
