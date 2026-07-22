import * as constants from "@Constants";
import * as Assets from "@assets";
import { env } from "../../../Env";

export function render() {
	const logo = env.scene.add.image(0, 0, Assets.images.logo.key);
	logo.setPosition(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y - 350);
	logo.setOrigin(0.5);
}
