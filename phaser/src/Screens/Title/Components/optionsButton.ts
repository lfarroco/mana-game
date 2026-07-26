import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";
import * as UIButton from "@Components/Button/UIButton";
import * as CreditsPanel from "../../../Screens/Title/Components/CreditsPanel";
import * as StatsPanel from "../../../Screens/Title/Components/StatsPanel";
import * as hideMainButtons from "../Effects/hideMainButtons";
import * as showMainButtons from "../Effects/showMainButtons";
import { env } from "@Env";
import { NavigationEvent } from "../../../Events";

let submenuContainer: Container;

const BUTTON_Y = 700;

export function create() {
	const title = i18n.t("title.options");
	const button = UIButton.create({
		text: title,
		position: [constants.MIDDLE_SCREEN_X, BUTTON_Y],
		callback: showOptionsSubmenu(),
		tooltip: {
			title,
			description: i18n.t("title.tooltip.options"),
			position: "right",
		},
	});
	return button;
}

const showOptionsSubmenu = () => () => {
	hideMainButtons.hideMainButtons();

	// Create submenu buttons
	const baseY = 500;
	const spacing = 100;

	const settingsBtn = UIButton.create({
		text: i18n.t("title.settings"),
		position: [constants.MIDDLE_SCREEN_X, baseY],
		callback: () => NavigationEvent.toOptions.emit(undefined),
	});

	const statsBtn = UIButton.create({
		text: i18n.t("title.stats"),
		position: [constants.MIDDLE_SCREEN_X, baseY + spacing],
		callback: () => {
			StatsPanel.openStats();
		},
	});

	const creditsBtn = UIButton.create({
		text: i18n.t("title.credits"),
		position: [constants.MIDDLE_SCREEN_X, baseY + spacing * 2],
		callback: () => {
			CreditsPanel.create();
		},
	});

	const backBtn = UIButton.create({
		text: i18n.t("title.back"),
		position: [constants.MIDDLE_SCREEN_X, baseY + spacing * 3],
		callback: () => {
			hideOptionsSubmenu();
			showMainButtons.showMainButtons();
		},
	});

	submenuContainer = env.container([
		settingsBtn.container,
		statsBtn.container,
		creditsBtn.container,
		backBtn.container,
	]);

	env.scene.children.bringToTop(submenuContainer);
}

function hideOptionsSubmenu() {
	submenuContainer.destroy(true);
}
