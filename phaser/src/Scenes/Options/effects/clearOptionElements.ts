import { getCurrentScene } from "@Models/State";
import OptionsScene from "../OptionsScene";


export function cleanTabContent() {

	const scene = getCurrentScene() as OptionsScene;
	scene.tabContent.forEach(element => {
		element.destroy();
	});
	scene.tabContent = [];
}
