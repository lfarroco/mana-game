import * as constants from "@Constants/constants";
import { t } from "@i18n/i18n";
import * as io from "@PhaserIO";

export const TITLE_Y = 120;
const TITLE_FONT_SIZE = "48px";

export function create() {
	return io.Text(t("crystalSelection.title"), {
		...constants.titleTextConfig,
		fontSize: TITLE_FONT_SIZE,
	})
		.setPosition(constants.MIDDLE_SCREEN_X, TITLE_Y)
		.setOrigin(0.5);
}
