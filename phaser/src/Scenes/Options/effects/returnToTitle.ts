import * as constants from "@Constants/constants";
import { getCurrentScene } from "@Models/State";
import { ANIMATION } from "../OptionsScene";

export function returnToTitle() {
	const scene = getCurrentScene();
	scene.cameras.main.fade(ANIMATION.FADE_DURATION, ANIMATION.FADE_COLOR.r, ANIMATION.FADE_COLOR.g, ANIMATION.FADE_COLOR.b);
	scene.cameras.main.once('camerafadeoutcomplete', () => {
		scene.scene.start(constants.SCENE_KEYS.TITLE);
	});
}
