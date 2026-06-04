import * as constants from "@Constants/constants";
import * as i18n from "@i18n/i18n";
import * as Geometry from "@Models/Geometry";
import * as UIButton from "Client/Components/UIButton";
import * as openOptions from "@Screens/Title/Effects/openOptions";
import * as CreditsPanel from "Client/Screens/Title/Components/CreditsPanel";
import * as StatsPanel from "Client/Screens/Title/Components/StatsPanel";
import * as hideMainButtons from "../Effects/hideMainButtons";
import * as showMainButtons from "../Effects/showMainButtons";

let submenuContainer: Container;

export function create(y: number) {
	const title = i18n.t("title.options");
	const button = UIButton.createUIButton({
		text: title,
		position: Geometry.vec2(constants.MIDDLE_SCREEN_X, y),
		callback: showOptionsSubmenu,
		tooltip: {
			title,
			description: i18n.t("title.tooltip.options"),
			position: "right",
		},
	});
	return button;
}

function showOptionsSubmenu() {
	hideMainButtons.hideMainButtons();

	// Create submenu buttons
	const baseY = 500;
	const spacing = 100;

	const settingsBtn = UIButton.createUIButton({
		text: i18n.t("title.settings"),
		position: Geometry.vec2(constants.MIDDLE_SCREEN_X, baseY),
		callback: openOptions.openOptions,
	});

	const statsBtn = UIButton.createUIButton({
		text: i18n.t("title.stats"),
		position: Geometry.vec2(constants.MIDDLE_SCREEN_X, baseY + spacing),
		callback: () => {
			StatsPanel.openStats();
		},
	});

	const creditsBtn = UIButton.createUIButton({
		text: i18n.t("title.credits"),
		position: Geometry.vec2(constants.MIDDLE_SCREEN_X, baseY + spacing * 2),
		callback: () => {
			CreditsPanel.openCredits();
		},
	});

	const backBtn = UIButton.createUIButton({
		text: i18n.t("title.back"),
		position: Geometry.vec2(constants.MIDDLE_SCREEN_X, baseY + spacing * 3),
		callback: () => {
			hideOptionsSubmenu();
			showMainButtons.showMainButtons();
		},
	});

	submenuContainer = io.Container([
		settingsBtn.container,
		statsBtn.container,
		creditsBtn.container,
		backBtn.container,
	]);

	io.BringToTop(submenuContainer);
}

function hideOptionsSubmenu() {
	submenuContainer.destroy(true);
}
