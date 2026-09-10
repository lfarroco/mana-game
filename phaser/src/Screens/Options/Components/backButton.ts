import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import { LAYOUT, type OptionsContext } from "@Screens/Options/optionsConfig";
import * as i18n from "@i18n/i18n";

/**
 * Create the "Back" button that navigates back to the title screen.
 * The container is added to the scene; Phaser destroys it on scene shutdown.
 */
export function create(ctx: OptionsContext): Phaser.GameObjects.Container {
	const btn = UIButton.create({
		text: i18n.t("options.back"),
		position: [constants.MIDDLE_SCREEN_X, LAYOUT.BACK_BUTTON_Y],
		callback: () => ctx.events.backToTitle.emit(),
	});
	return btn.container;
}
