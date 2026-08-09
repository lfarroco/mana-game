import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";
import { env } from "@Env";

export const TITLE_Y = 120;

export function create() {
	return env.scene.add
		.text(0, 0, i18n.t("crystalSelection.title"), constants.titleTextConfig)
		.setPosition(constants.MIDDLE_SCREEN_X, TITLE_Y)
		.setOrigin(0.5);
}
