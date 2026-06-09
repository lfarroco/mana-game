import * as constants from "@Constants";
import * as OptionsScreen from "@Screens/Options/OptionsScreen";

import * as i18n from "@i18n/i18n";

export function create() {
	const optionsLabel = io.Text(i18n.t("options.title"), {
		...constants.titleTextConfig,
		fontSize: OptionsScreen.LAYOUT.TITLE_FONT_SIZE,
	});
	io.SetPosition(optionsLabel, [constants.MIDDLE_SCREEN_X, OptionsScreen.LAYOUT.TITLE_Y]);
	io.Centralize(optionsLabel);
}
