import { getOption, setOption } from "@Models/OptionsStore";
import { getCurrentScene } from "@Models/State";
import OptionsScene from "../OptionsScene";
import { createMultiChoiceOption } from "./createMultiChoiceOption";


export function graphicsTab(startY: number) {
	return createMultiChoiceOption('Particles', startY,
		['low', 'medium', 'high'],
		() => getOption('particles', 'medium'),
		value => {
			setOption('particles', value as 'low' | 'medium' | 'high');

			const scene = getCurrentScene() as OptionsScene;
			scene.cloudsBackground.updateParticleQuality();
		}
	);
}
