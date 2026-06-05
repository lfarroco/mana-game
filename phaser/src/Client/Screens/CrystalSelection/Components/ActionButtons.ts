import * as UIButton from "@Components/Button/UIButton";
import * as constants from "../../../../Constants";
import * as i18n from "@i18n/i18n";
import * as Geometry from "@Models/Geometry";
import * as Effects from "../Effects";

const PLAY_BUTTON_Y = 830;
const BACK_BUTTON_Y = 930;

export function create() {
	UIButton.create({
		text: i18n.t("crystalSelection.play"),
		position: Geometry.vec2(
			constants.MIDDLE_SCREEN_X,
			PLAY_BUTTON_Y,
		),
		callback: Effects.startNewGame,
	});
	UIButton.create({
		text: i18n.t("crystalSelection.back"),
		position: Geometry.vec2(
			constants.MIDDLE_SCREEN_X,
			BACK_BUTTON_Y,
		),
		callback: Effects.returnToTitle,
	});
}
