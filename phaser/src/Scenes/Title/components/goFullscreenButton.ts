import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";
import { createUIButton } from "@Components/UIButton";

export function goFullscreenButton() {
	createUIButton(
		'GO FULLSCREEN',
		vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + 400),
		() => {
			const scene = getCurrentScene();
			if (scene.scale.isFullscreen) {
				scene.scale.stopFullscreen();
			} else {
				scene.scale.startFullscreen();
			}
		}
	);
}
