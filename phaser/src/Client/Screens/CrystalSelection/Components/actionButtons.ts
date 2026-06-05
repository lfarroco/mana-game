import { createUIButton } from "Client/Components/UIButton";
import * as constants from "@Constants/constants";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/SharedGeometry";
import * as _ from "../CrystalSelectionScene";
import { returnToTitle } from "../Effects/returnToTitle";
import { startNewGame } from "../Effects/startNewGame";

const PLAY_BUTTON_Y = 830;
const BACK_BUTTON_Y = 930;

export function create() {
	createUIButton({
		text: t("crystalSelection.play"),
		position: vec2(constants.MIDDLE_SCREEN_X, PLAY_BUTTON_Y),
		callback: startNewGame,
	});
	createUIButton({
		text: t("crystalSelection.back"),
		position: vec2(constants.MIDDLE_SCREEN_X, BACK_BUTTON_Y),
		callback: returnToTitle,
	});
}
