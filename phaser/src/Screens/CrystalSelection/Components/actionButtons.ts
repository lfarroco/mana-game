import * as UIButton from "@Components/Button/UIButton";
import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as Effects from "../Effects";
import { ClientState } from "@Models/ClientState";

const PLAY_BUTTON_Y = 830;
const BACK_BUTTON_Y = 930;

export function create(clientState: ClientState) {
	UIButton.create({
		text: i18n.t("crystalSelection.play"),
		position: [
			constants.MIDDLE_SCREEN_X,
			PLAY_BUTTON_Y,
		],
		callback: Effects.startNewGame(clientState),
	});
	UIButton.create({
		text: i18n.t("crystalSelection.back"),
		position: [
			constants.MIDDLE_SCREEN_X,
			BACK_BUTTON_Y,
		],
		callback: Effects.returnToTitle(clientState),
	});
}
