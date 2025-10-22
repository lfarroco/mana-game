import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { images } from "../../../assets";

export function logo() {
	const logo = io.Image(images.logo.key);
	io.SetPosition(logo, vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y - 200));
	io.Centralize(logo);
}
