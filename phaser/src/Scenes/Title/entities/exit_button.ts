import * as constants from "@Constants/constants";
import { Entity } from "@Models/Entities/Entity";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@UI/UIButton";

const create = () => createUIButton(
	'EXIT',
	vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + 380),
	() => {
		window.close();
	}
);

export default {
	key: "exit_button",
	create
} as Entity;