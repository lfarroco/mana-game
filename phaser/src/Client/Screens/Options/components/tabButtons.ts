import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { Button, createUIButton } from "@Components/UIButton";
import { LAYOUT } from "Client/Screens/Options/OptionsScene";
import { showTab } from "Client/Screens/Options/components/effects/showTab";
import { updateTabButtonStates } from "Client/Screens/Options/components/effects/updateTabButtonStates";
import { t } from "@i18n/i18n";

export const buttonIndex: { [key: string]: Button } = {};

export function tabButtons() {
	const tabButtonY = LAYOUT.TAB_BUTTON_Y;
	const buttonSpacing = LAYOUT.TAB_BUTTON_SPACING;
	const startX = constants.MIDDLE_SCREEN_X - buttonSpacing;

	buttonIndex["audio"] = createUIButton({
		text: t("options.tabs.audio"),
		position: vec2(startX, tabButtonY),
		callback: () => showTab("audio"),
		width: LAYOUT.TAB_BUTTON_WIDTH,
	});

	buttonIndex["graphics"] = createUIButton({
		text: t("options.tabs.graphics"),
		position: vec2(startX + buttonSpacing, tabButtonY),
		callback: () => showTab("graphics"),
		width: LAYOUT.TAB_BUTTON_WIDTH,
	});

	buttonIndex["game"] = createUIButton({
		text: t("options.tabs.game"),
		position: vec2(startX + buttonSpacing * 2, tabButtonY),
		callback: () => showTab("game"),
		width: LAYOUT.TAB_BUTTON_WIDTH,
	});

	updateTabButtonStates();
}
