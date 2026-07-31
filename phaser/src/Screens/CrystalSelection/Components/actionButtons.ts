import * as UIButton from "@Components/Button/UIButton";
import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as CrystalSelectionScreen from "../CrystalSelectionScreen";

const PLAY_BUTTON_Y = 830;
const BACK_BUTTON_Y = 930;

/**
 * Create the play and back action buttons.
 * Returns the button containers so the caller can track them for disposal.
 */
export function create(): Phaser.GameObjects.Container[] {
	const playBtn = UIButton.create({
		text: i18n.t("crystalSelection.play"),
		position: [
			constants.MIDDLE_SCREEN_X,
			PLAY_BUTTON_Y,
		],
		callback: () => CrystalSelectionScreen.getEvents().playClicked.emit(),
	});

	const backBtn = UIButton.create({
		text: i18n.t("crystalSelection.back"),
		position: [
			constants.MIDDLE_SCREEN_X,
			BACK_BUTTON_Y,
		],
		callback: () => CrystalSelectionScreen.getEvents().backClicked.emit(),
	});

	return [playBtn.container, backBtn.container];
}

