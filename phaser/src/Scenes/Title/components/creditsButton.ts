import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { openCredits } from "./CreditsPanel";
import { t } from "@i18n/i18n";

export function creditsButton(y: number) {
	createUIButton(
		t("title.credits"),
		vec2(constants.MIDDLE_SCREEN_X, y),
		openCredits
	);
}
