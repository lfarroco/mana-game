import { Tabs } from "@Screens/Options/Components/Model";
import { buttonIndex } from "@Screens/Options/Components/tabButtons";
import { currentTab } from "@Screens/Options/Components/effects/showTab";

const SELECTED_TAB_COLOR = "#FFD700";
const SELECTED_TAB_STROKE_WIDTH = 4;
const UNSELECTED_TAB_COLOR = "#FFFFFF";
const UNSELECTED_TAB_STROKE_WIDTH = 3;
const TAB_STROKE_COLOR = "#000000";

export function updateTabButtonStates() {
	Object.keys(buttonIndex).forEach((tabKey) => {
		const tab = tabKey as Tabs;
		const button = buttonIndex[tab];
		if (tab === currentTab.key) {
			button.text.setColor(SELECTED_TAB_COLOR);
			button.text.setStroke(TAB_STROKE_COLOR, SELECTED_TAB_STROKE_WIDTH);
		} else {
			button.text.setColor(UNSELECTED_TAB_COLOR);
			button.text.setStroke(TAB_STROKE_COLOR, UNSELECTED_TAB_STROKE_WIDTH);
		}
	});
}
