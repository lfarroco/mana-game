import * as UIButton from "@Components/Button/UIButton";
import * as Constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as CrystalSelectionScreen from "../CrystalSelectionScreen";
import * as bg from "./background"

const NAV_BUTTON_OFFSET_X = 350;
const NAV_BUTTON_WIDTH = 200;

export function create() {
	const { state, events } = CrystalSelectionScreen;

	UIButton.create({
		text: i18n.t("crystalSelection.previous"),
		position: [
			Constants.MIDDLE_SCREEN_X - NAV_BUTTON_OFFSET_X,
			bg.CARD_DISPLAY_Y
		],
		callback: () => {
			const newIndex = (state.currentIndex - 1 + state.crystals.length) % state.crystals.length;
			events.crystalChanged.emit({ index: newIndex });
		},
		width: NAV_BUTTON_WIDTH,
	});

	UIButton.create({
		text: i18n.t("crystalSelection.next"),
		position: [
			Constants.MIDDLE_SCREEN_X + NAV_BUTTON_OFFSET_X,
			bg.CARD_DISPLAY_Y,
		],
		callback: () => {
			const newIndex = (state.currentIndex + 1) % state.crystals.length;
			events.crystalChanged.emit({ index: newIndex });
		},
		width: NAV_BUTTON_WIDTH,
	});
}
