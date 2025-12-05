import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { openCredits } from "./CreditsPanel";

export function creditsButton(y: number) {
	createUIButton(
		"CREDITS",
		vec2(constants.MIDDLE_SCREEN_X, y),
		openCredits
	);
}
