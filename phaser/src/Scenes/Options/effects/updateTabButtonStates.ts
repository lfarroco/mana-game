import { getCurrentScene } from "@Models/State";
import OptionsScene, { TabType, STYLES } from "../OptionsScene";


export function updateTabButtonStates() {
	const scene = getCurrentScene() as OptionsScene;
	Object.keys(scene.tabButtons).forEach(tabKey => {
		const tab = tabKey as TabType;
		const button = scene.tabButtons[tab];
		if (tab === scene.currentTab) {
			button.text.setColor(STYLES.SELECTED_TAB_COLOR);
			button.text.setStroke(STYLES.TAB_STROKE_COLOR, STYLES.SELECTED_TAB_STROKE_WIDTH);
		} else {
			button.text.setColor(STYLES.UNSELECTED_TAB_COLOR);
			button.text.setStroke(STYLES.TAB_STROKE_COLOR, STYLES.UNSELECTED_TAB_STROKE_WIDTH);
		}
	});
}
