import * as constants from "@Constants/constants";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { openOptions } from "Client/Screens/Title/effects/openOptions";
import { openCredits } from "Client/Screens/Title/components/CreditsPanel";
import { openStats } from "Client/Screens/Title/components/StatsPanel";
import * as io from "@PhaserIO";
import { getCloudsBg } from "Client/Screens/Title/components/cloudsBg";
import * as TitleScene from "@Scenes/Title/TitleScene";

let submenuContainer: Container;

export function optionsButton(y: number) {
	const title = t("title.options");
	const button = createUIButton({
		text: title,
		position: vec2(constants.MIDDLE_SCREEN_X, y),
		callback: showOptionsSubmenu,
		tooltip: {
			title,
			description: t("title.tooltip.options"),
			position: "right",
		},
	});
	return button;
}

function showOptionsSubmenu() {
	TitleScene.hideMainButtons();

	// Create submenu buttons
	const baseY = 500;
	const spacing = 100;

	const settingsBtn = createUIButton({
		text: t("title.settings"),
		position: vec2(constants.MIDDLE_SCREEN_X, baseY),
		callback: () => {
			hideOptionsSubmenu();
			openOptions();

			const bg = getCloudsBg();
			if (bg) {
				bg.tweenToPreset("sunset", 2000, "Quad.easeInOut");
			}
		},
	});

	const statsBtn = createUIButton({
		text: t("title.stats"),
		position: vec2(constants.MIDDLE_SCREEN_X, baseY + spacing),
		callback: () => {
			openStats();
		},
	});

	const creditsBtn = createUIButton({
		text: t("title.credits"),
		position: vec2(constants.MIDDLE_SCREEN_X, baseY + spacing * 2),
		callback: () => {
			openCredits();
		},
	});

	const backBtn = createUIButton({
		text: t("title.back"),
		position: vec2(constants.MIDDLE_SCREEN_X, baseY + spacing * 3),
		callback: () => {
			hideOptionsSubmenu();
			TitleScene.showMainButtons();
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
