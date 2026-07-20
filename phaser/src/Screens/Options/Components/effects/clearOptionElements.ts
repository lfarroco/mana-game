import { tabContent } from "@Screens/Options/Components/effects/showTab";

export function cleanTabContent() {
	tabContent.children.forEach((element) => {
		element.destroy();
	});
	tabContent.children = [];
}
