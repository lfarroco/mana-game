import * as constants from "@Constants/constants";
import { Entity } from "@Models/Entities/Entity";
import { vec2 } from "@Models/Geometry";
import { getState } from "@Models/State";
import { createUIButton } from "@UI/UIButton";

const create = () => createUIButton(
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
);


export default {
	key: "go_fullscreen_button",
	create
} as Entity;