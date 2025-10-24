import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { LAYOUT } from "../OptionsScene";

export function optionsLabel() {
	const optionsLabel = io.Text(
		'OPTIONS',
		{
			...constants.titleTextConfig,
			fontSize: LAYOUT.TITLE_FONT_SIZE
		}
	);
	io.SetPosition(optionsLabel, vec2(constants.MIDDLE_SCREEN_X, LAYOUT.TITLE_Y))
	io.Centralize(optionsLabel);
}
