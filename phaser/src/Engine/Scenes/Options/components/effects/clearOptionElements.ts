import { tabContent } from "@Scenes/Options/components/effects/showTab";

export function cleanTabContent() {
	tabContent.children.forEach((element) => {
		element.destroy();
	});
	tabContent.children = [];
}
