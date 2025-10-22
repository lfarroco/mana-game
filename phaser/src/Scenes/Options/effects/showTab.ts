import { getCurrentScene } from "@Models/State";
import OptionsScene, { TabType, LAYOUT } from "../OptionsScene";
import { updateTabButtonStates } from "./updateTabButtonStates";
import { clearOptionElements } from "./clearOptionElements";

export function showTab(tabType: TabType) {

	const scene = getCurrentScene() as OptionsScene;
	scene.currentTab = tabType;
	clearOptionElements();
	updateTabButtonStates();

	const startY = LAYOUT.OPTIONS_START_Y;
	const lineHeight = LAYOUT.OPTIONS_LINE_HEIGHT;

	switch (tabType) {
		case 'audio':
			scene.createAudioOptions(startY, lineHeight);
			break;
		case 'graphics':
			scene.createGraphicsOptions(startY);
			break;
		case 'game':
			scene.createGameOptions(startY, lineHeight);
			break;
	}
}
