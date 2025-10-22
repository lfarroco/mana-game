import { getCurrentScene } from "@Models/State";
import OptionsScene from "../OptionsScene";


export function clearOptionElements() {

	const scene = getCurrentScene() as OptionsScene;
	scene.optionElements.forEach(element => {
		element.destroy();
	});
	scene.optionElements = [];
}
