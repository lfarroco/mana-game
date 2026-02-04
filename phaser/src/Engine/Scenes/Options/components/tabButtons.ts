import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { Button, createUIButton } from "@Components/UIButton";
import { LAYOUT } from "../OptionsScene";
import { showTab } from "./effects/showTab";
import { updateTabButtonStates } from "./effects/updateTabButtonStates";
import { t } from "@i18n/i18n";

export let buttonIndex: { [key: string]: Button } = {};

export function tabButtons() {
	const tabButtonY = LAYOUT.TAB_BUTTON_Y;
	const buttonSpacing = LAYOUT.TAB_BUTTON_SPACING;
	const startX = constants.MIDDLE_SCREEN_X - buttonSpacing;

	buttonIndex["audio"] = createUIButton(
		t("options.tabs.audio"),
		vec2(startX, tabButtonY),
		() => showTab("audio"),
		LAYOUT.TAB_BUTTON_WIDTH
	);

	buttonIndex["graphics"] = createUIButton(
		t("options.tabs.graphics"),
		vec2(startX + buttonSpacing, tabButtonY),
		() => showTab("graphics"),
		LAYOUT.TAB_BUTTON_WIDTH
	);

	buttonIndex["game"] = createUIButton(
		t("options.tabs.game"),
		vec2(startX + buttonSpacing * 2, tabButtonY),
		() => showTab("game"),
		LAYOUT.TAB_BUTTON_WIDTH
	);

	updateTabButtonStates();
}
