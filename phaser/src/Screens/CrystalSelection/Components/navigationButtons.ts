import * as UIButton from "@Components/Button/UIButton";
import * as Constants from "@Constants";
import * as i18n from "@i18n/i18n";
import { getSelection } from "../selection";
import * as bg from "./background";
import type { CrystalSelectionContext } from "../CrystalSelectionScene";

const NAV_BUTTON_OFFSET_X = 350;
const NAV_BUTTON_WIDTH = 200;

/**
 * Create the prev/next navigation buttons. The containers are added to the
 * scene; Phaser destroys them on scene shutdown.
 */
export function create(ctx: CrystalSelectionContext): Phaser.GameObjects.Container[] {
	const prevBtn = UIButton.create({
		text: i18n.t("crystalSelection.previous"),
		position: [Constants.MIDDLE_SCREEN_X - NAV_BUTTON_OFFSET_X, bg.CARD_DISPLAY_Y],
		callback: () => {
			const { crystals, currentIndex } = getSelection();
			const newIndex = (currentIndex - 1 + crystals.length) % crystals.length;
			ctx.events.crystalChanged.emit({ index: newIndex });
		},
		width: NAV_BUTTON_WIDTH,
	});

	const nextBtn = UIButton.create({
		text: i18n.t("crystalSelection.next"),
		position: [Constants.MIDDLE_SCREEN_X + NAV_BUTTON_OFFSET_X, bg.CARD_DISPLAY_Y],
		callback: () => {
			const { crystals, currentIndex } = getSelection();
			const newIndex = (currentIndex + 1) % crystals.length;
			ctx.events.crystalChanged.emit({ index: newIndex });
		},
		width: NAV_BUTTON_WIDTH,
	});

	return [prevBtn.container, nextBtn.container];
}
