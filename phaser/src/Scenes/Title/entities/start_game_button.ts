import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { ButtonSpec } from "@UI/UIButton";

export default ButtonSpec(
	"start_game_button",
	'START GAME',
	vec2(constants.MIDDLE_SCREEN.x, constants.MIDDLE_SCREEN.y + 100),
	async () => {
		await io.Fade(300, 0x000000);
		io.StartScene(constants.SCENE_KEYS.BATTLEGROUND);
	}
)
