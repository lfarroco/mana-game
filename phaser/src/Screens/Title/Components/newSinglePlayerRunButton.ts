import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as i18n from "@i18n/i18n";
import * as TitleScreen from "../TitleScreen";
import { ScreenCtx } from "../../screenTracking";

export const create = (y: number, ctx: ScreenCtx<TitleScreen.TitlePhase, TitleScreen.TitleScreenEvents>) =>
	UIButton.create({
		text: i18n.t("title.newRun"),
		position: [constants.MIDDLE_SCREEN_X, y],
		callback: () => ctx.events.newGameButtonClicked.emit(),
	});

