import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as OptionsScreen from "@Screens/Options/OptionsScreen";
import * as showTab from "@Screens/Options/Components/effects/showTab";
import * as updateTabButtonStates from "@Screens/Options/Components/effects/updateTabButtonStates";
import * as i18n from "@i18n/i18n";

export const buttonIndex: { [key: string]: UIButton.Button } = {};

export function create() {
	const tabButtonY = OptionsScreen.LAYOUT.TAB_BUTTON_Y;
	const buttonSpacing = OptionsScreen.LAYOUT.TAB_BUTTON_SPACING;
	const startX = constants.MIDDLE_SCREEN_X - buttonSpacing;

	buttonIndex["audio"] = UIButton.create({
		text: i18n.t("options.tabs.audio"),
		position: [startX, tabButtonY],
		callback: () => showTab.showTab("audio"),
		width: OptionsScreen.LAYOUT.TAB_BUTTON_WIDTH,
	});

	buttonIndex["graphics"] = UIButton.create({
		text: i18n.t("options.tabs.graphics"),
		position: [startX + buttonSpacing, tabButtonY],
		callback: () => showTab.showTab("graphics"),
		width: OptionsScreen.LAYOUT.TAB_BUTTON_WIDTH,
	});

	buttonIndex["game"] = UIButton.create({
		text: i18n.t("options.tabs.game"),
		position: [startX + buttonSpacing * 2, tabButtonY],
		callback: () => showTab.showTab("game"),
		width: OptionsScreen.LAYOUT.TAB_BUTTON_WIDTH,
	});

	updateTabButtonStates.updateTabButtonStates();
}
