import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { Text, Centralize } from "@PhaserIO";
import { LAYOUT } from "../OptionsScene";

export function optionsLabel() {
	const optionsLabel = Text(
		vec2(constants.MIDDLE_SCREEN_X, LAYOUT.TITLE_Y),
		'OPTIONS',
		{
			...constants.titleTextConfig,
			fontSize: LAYOUT.TITLE_FONT_SIZE
		}
	);
	Centralize(optionsLabel);
}
