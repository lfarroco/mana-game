import * as constants from "@Constants";
import * as OptionsScreen from "@Screens/Options/OptionsScreen";

import * as i18n from "@i18n/i18n";
import { env } from "@Env";

export function create() {
	const optionsLabel = env.scene.add.text(0, 0, i18n.t("options.title"), {
		...constants.titleTextConfig,
		fontSize: OptionsScreen.LAYOUT.TITLE_FONT_SIZE,
	});
	optionsLabel.setPosition(constants.MIDDLE_SCREEN_X, OptionsScreen.LAYOUT.TITLE_Y);
	optionsLabel.setOrigin(0.5);
}
