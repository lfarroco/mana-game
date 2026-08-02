import * as c from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as constants from "@Constants";
import { dispatchAction } from "../BattlegroundScreen";

export const skipButton = () => UIButton.create({
	text: "Skip",
	position: [
		constants.BATTLEGROUND_BUTTON_X,
		c.SCREEN_HEIGHT - constants.BATTLEGROUND_BUTTON_MARGIN_BOTTOM
	],
	callback: () => {
		void dispatchAction({ type: "skip" });
	}
});