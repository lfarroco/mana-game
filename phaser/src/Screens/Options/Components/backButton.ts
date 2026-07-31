import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as OptionsScreen from "@Screens/Options/OptionsScreen";
import * as i18n from "@i18n/i18n";
import { ScreenCtx } from "../../screenTracking";

/**
 * Create the "Back" button that navigates back to the title screen.
 * Returns the button's Phaser Container so the caller can track it for
 * automatic disposal.
 */
export function create(ctx: ScreenCtx<OptionsScreen.OptionsPhase, OptionsScreen.OptionsScreenEvents>): Phaser.GameObjects.Container {
	const btn = UIButton.create({
		text: i18n.t("options.back"),
		position: [constants.MIDDLE_SCREEN_X, OptionsScreen.LAYOUT.BACK_BUTTON_Y],
		callback: () => ctx.events.backToTitle.emit(),
	});
	return btn.container;
}
