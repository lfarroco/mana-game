import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getState } from "@Models/State";
import { ButtonSpec } from "@UI/UIButton";

export default ButtonSpec(
	"go_fullscreen_button",
	'GO FULLSCREEN',
	vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + 300),
	() => {
		const scene = getState().currentScene;
		if (scene.scale.isFullscreen) {
			scene.scale.stopFullscreen();
		} else {
			scene.scale.startFullscreen();
		}
	}
)

