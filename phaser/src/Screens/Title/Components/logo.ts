import * as constants from "@Constants";
import * as Assets from "@assets";

export function render() {
	const logo = io.Image(Assets.images.logo.key);
	io.SetPosition(logo, [constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y - 350]);
	io.Centralize(logo);
}
