import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { LAYOUT } from "Client/Screens/Options/OptionsScene";

import { t } from "@i18n/i18n";
export function optionsLabel() {
	const optionsLabel = io.Text(t("options.title"), {
		...constants.titleTextConfig,
		fontSize: LAYOUT.TITLE_FONT_SIZE,
	});
	io.SetPosition(optionsLabel, vec2(constants.MIDDLE_SCREEN_X, LAYOUT.TITLE_Y));
	io.Centralize(optionsLabel);
}
