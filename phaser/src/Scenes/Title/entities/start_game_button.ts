import * as constants from "@Constants/constants";
import { Entity } from "@Models/Entities/Entity";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { createUIButton } from "@UI/UIButton";

const create = () => createUIButton(
	'START GAME',
	vec2(constants.MIDDLE_SCREEN.x, constants.MIDDLE_SCREEN.y + 100),
	async () => {
		await io.Fade(300, 0x000000);
		io.StartScene(constants.SCENE_KEYS.BATTLEGROUND);
	}
);

export default {
	key: "start_game_button",
	create
} as Entity