import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";
import { createUIButton } from "@Components/UIButton";
import { t } from "@i18n/i18n";

export function goFullscreenButton(y: number) {
	return createUIButton(
		t("title.fullscreen"),
		vec2(constants.MIDDLE_SCREEN_X, y),
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
