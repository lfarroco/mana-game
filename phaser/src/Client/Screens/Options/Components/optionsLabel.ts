import * as constants from "@Constants/constants";
import * as Geometry from "@Models/Geometry";
import * as io from "@PhaserIO";
import * as OptionsScreen from "@Screens/Options/OptionsScreen";

import * as i18n from "@i18n/i18n";

export function create() {
	const optionsLabel = io.Text(i18n.t("options.title"), {
		...constants.titleTextConfig,
		fontSize: OptionsScreen.LAYOUT.TITLE_FONT_SIZE,
	});
	io.SetPosition(optionsLabel, Geometry.vec2(constants.MIDDLE_SCREEN_X, OptionsScreen.LAYOUT.TITLE_Y));
	io.Centralize(optionsLabel);
}
