import * as constants from "@Constants/constants";
import { Entity } from "@Models/Entities/Entity";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { createUIButton } from "@UI/UIButton";

const create = () => createUIButton(
	'OPTIONS',
	vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + 180),
	async () => {

		await io.Fade(300, 0x000000);
		io.StartScene(constants.SCENE_KEYS.OPTIONS);

	}
);

export default {
	key: "start_game_button",
	create
} as Entity;