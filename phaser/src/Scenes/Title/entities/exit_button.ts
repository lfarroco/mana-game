import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { ButtonSpec } from "@UI/UIButton";

export default ButtonSpec(
	"exit_button",
	'EXIT',
	vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + 380),
	() => {
		window.close();
	}
)
