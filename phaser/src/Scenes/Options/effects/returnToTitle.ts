import * as constants from "@Constants/constants";
import { getCurrentScene } from "@Models/State";

export function returnToTitle() {
	const scene = getCurrentScene();
	scene.cameras.main.fade(
		ANIMATION.FADE_DURATION,
		ANIMATION.FADE_COLOR.r,
		ANIMATION.FADE_COLOR.g,
		ANIMATION.FADE_COLOR.b
	);
	scene.cameras.main.once("camerafadeoutcomplete", () => {
		scene.scene.start(constants.SCENE_KEYS.TITLE);
	});
}
export const ANIMATION = {
	FADE_DURATION: 500,
	FADE_COLOR: { r: 0, g: 0, b: 0 },
} as const;
