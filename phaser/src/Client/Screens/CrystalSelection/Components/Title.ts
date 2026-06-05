import * as constants from "../../../../Constants";
import * as i18n from "@i18n/i18n";

export const TITLE_Y = 120;

export function create() {
	return io.Title1(i18n.t("crystalSelection.title"))
		.setPosition(constants.MIDDLE_SCREEN_X, TITLE_Y);
}
