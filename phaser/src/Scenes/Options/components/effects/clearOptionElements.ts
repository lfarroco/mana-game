import { tabContent } from "./showTab";

export function cleanTabContent() {
	tabContent.children.forEach((element) => {
		element.destroy();
	});
	tabContent.children = [];
}
