import * as UIButton from "@Components/Button/UIButton";
import * as i18n from "@i18n/i18n";
import * as constants from "@Constants";
import * as Effects from "../Effects";

const BUTTON_Y = 900;

export const create = () =>
	UIButton.create({
		text: i18n.t("title.exit"),
		position: [constants.MIDDLE_SCREEN_X, BUTTON_Y],
		callback: Effects.exitGame,
	}).container;
