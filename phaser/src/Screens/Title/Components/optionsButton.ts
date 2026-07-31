import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as UIButton from "@Components/Button/UIButton";
import * as CreditsPanel from "@Screens/Title/Components/CreditsPanel";
import * as StatsPanel from "@Screens/Title/Components/StatsPanel";
import * as TitleScreen from "../TitleScreen";
import { NavigationEvent } from "../../../Events";

const BUTTON_Y = 700;

export function create(ctx: TitleScreen.Context) {
	const title = i18n.t("title.options");
	return UIButton.create({
		text: title,
		position: [constants.MIDDLE_SCREEN_X, BUTTON_Y],
		callback: () => {
			void ctx.go("options_submenu");
		},
		tooltip: {
			title,
			description: i18n.t("title.tooltip.options"),
			position: "right",
		},
	}).container;
}

export function createSubmenu(ctx: TitleScreen.Context) {
	const baseY = 500;
	const spacing = 100;

	const settingsBtn = UIButton.create({
		text: i18n.t("title.settings"),
		position: [constants.MIDDLE_SCREEN_X, baseY],
		callback: NavigationEvent.toOptions.emit,
	});

	const statsBtn = UIButton.create({
		text: i18n.t("title.stats"),
		position: [constants.MIDDLE_SCREEN_X, baseY + spacing],
		callback: StatsPanel.openStats
	});

	const creditsBtn = UIButton.create({
		text: i18n.t("title.credits"),
		position: [constants.MIDDLE_SCREEN_X, baseY + spacing * 2],
		callback: CreditsPanel.create
	});

	const backBtn = UIButton.create({
		text: i18n.t("title.back"),
		position: [constants.MIDDLE_SCREEN_X, baseY + spacing * 3],
		callback: () => {
			void ctx.go("main");
		},
	});

	return [
		settingsBtn.container,
		statsBtn.container,
		creditsBtn.container,
		backBtn.container,
	]

}
