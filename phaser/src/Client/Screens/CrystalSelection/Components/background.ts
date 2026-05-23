import * as constants from "@Constants/constants";
import * as io from "@PhaserIO";
import { CARD_DISPLAY_Y, CARD_DISPLAY_BG_WIDTH, CARD_DISPLAY_BG_HEIGHT, CARD_DISPLAY_BG_COLOR, CARD_DISPLAY_BG_ALPHA } from "../CrystalSelectionScene";

// export function init(data: CrystalSelectionData) {
// 	isMultiplayer = data.isMultiplayer || data.isArena || false;
// 	multiplayerQueueType = data.multiplayerQueueType || "casual";
// 	if (isMultiplayer) {
// 		logger.debug("Entering Arena Mode (Multiplayer)");
// 	}
// }
export function background() {
	return io.scene.add.rectangle(
		constants.MIDDLE_SCREEN_X,
		CARD_DISPLAY_Y,
		CARD_DISPLAY_BG_WIDTH,
		CARD_DISPLAY_BG_HEIGHT,
		CARD_DISPLAY_BG_COLOR,
		CARD_DISPLAY_BG_ALPHA
	);
}
