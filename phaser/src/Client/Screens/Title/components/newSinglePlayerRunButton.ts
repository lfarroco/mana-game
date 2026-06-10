import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as i18n from "@i18n/i18n";

export const create = (y: number) =>
	UIButton.create({
		text: i18n.t("title.newRun"),
		position: [constants.MIDDLE_SCREEN_X, y],
		callback: io.screens.title.events.newGameButtonClicked.emit
	});

