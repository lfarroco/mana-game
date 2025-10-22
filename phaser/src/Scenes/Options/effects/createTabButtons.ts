import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";
import { createUIButton } from "@UI/UIButton";
import OptionsScene, { LAYOUT } from "../OptionsScene";
import { showTab } from "./showTab";
import { updateTabButtonStates } from "./updateTabButtonStates";

export function createTabButtons() {
	const tabButtonY = LAYOUT.TAB_BUTTON_Y;
	const buttonSpacing = LAYOUT.TAB_BUTTON_SPACING;
	const startX = constants.MIDDLE_SCREEN_X - buttonSpacing;

	const scene = getCurrentScene() as OptionsScene;

	scene.tabButtons.audio = createUIButton(
		'AUDIO',
		vec2(startX, tabButtonY),
		() => showTab('audio'),
		LAYOUT.TAB_BUTTON_WIDTH
	);

	scene.tabButtons.graphics = createUIButton(
		'GRAPHICS',
		vec2(startX + buttonSpacing, tabButtonY),
		() => showTab('graphics'),
		LAYOUT.TAB_BUTTON_WIDTH
	);

	scene.tabButtons.game = createUIButton(
		'GAME',
		vec2(startX + buttonSpacing * 2, tabButtonY),
		() => showTab('game'),
		LAYOUT.TAB_BUTTON_WIDTH
	);

	updateTabButtonStates();
}
