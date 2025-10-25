import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { Button, createUIButton } from "@Components/UIButton";
import { LAYOUT } from "../OptionsScene";
import { showTab } from "./effects/showTab";
import { updateTabButtonStates } from "./effects/updateTabButtonStates";

export let buttonIndex: { [key: string]: Button } = {}

export function tabButtons() {
	const tabButtonY = LAYOUT.TAB_BUTTON_Y;
	const buttonSpacing = LAYOUT.TAB_BUTTON_SPACING;
	const startX = constants.MIDDLE_SCREEN_X - buttonSpacing;

	buttonIndex['audio'] = createUIButton(
		'AUDIO',
		vec2(startX, tabButtonY),
		() => showTab('audio'),
		LAYOUT.TAB_BUTTON_WIDTH
	);

	buttonIndex['graphics'] = createUIButton(
		'GRAPHICS',
		vec2(startX + buttonSpacing, tabButtonY),
		() => showTab('graphics'),
		LAYOUT.TAB_BUTTON_WIDTH
	);

	buttonIndex['game'] = createUIButton(
		'GAME',
		vec2(startX + buttonSpacing * 2, tabButtonY),
		() => showTab('game'),
		LAYOUT.TAB_BUTTON_WIDTH
	);

	updateTabButtonStates();
}
