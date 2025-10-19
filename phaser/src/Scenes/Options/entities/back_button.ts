import { MIDDLE_SCREEN_X } from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { ButtonSpec } from "@UI/UIButton";
import return_to_title from "../events/return_to_title";

const BACK_BUTTON_Y = 950;

export default ButtonSpec(
	"back_button",
	'BACK',
	vec2(
		MIDDLE_SCREEN_X,
		BACK_BUTTON_Y,
	),
	() => {
		return_to_title.handler({});
	}
)