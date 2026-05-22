import * as constants from "@Constants/constants";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { openOptions } from "Client/Scenes/Title/effects/openOptions";
import { openCredits } from "Client/Scenes/Title/components/CreditsPanel";
import { openStats } from "Client/Scenes/Title/components/StatsPanel";
import * as io from "@PhaserIO";
import { getCloudsBg } from "Client/Scenes/Title/components/cloudsBg";
import * as TitleScene from "@Scenes/Title/TitleScene";

let submenuContainer: Container;

export function optionsButton(y: number) {
	const title = t("title.options");
	const button = createUIButton(
		title,
		vec2(constants.MIDDLE_SCREEN_X, y),
		showOptionsSubmenu,
		undefined,
		undefined,
		{
			title,
			description: t("title.tooltip.options"),
			position: "right",
		}
	);
	return button;
}

function showOptionsSubmenu() {

	TitleScene.hideMainButtons();

	// Create submenu buttons
	const baseY = 500;
	const spacing = 100;

	const settingsBtn = createUIButton(
		t("title.settings"),
		vec2(constants.MIDDLE_SCREEN_X, baseY),
		() => {
			hideOptionsSubmenu();
			openOptions();

			const bg = getCloudsBg();
			if (bg) {
				bg.tweenToPreset("sunset", 2000, "Quad.easeInOut");
			}
		}
	);

	const statsBtn = createUIButton(
		t("title.stats"),
		vec2(constants.MIDDLE_SCREEN_X, baseY + spacing),
		() => {
			openStats();
		}
	);

	const creditsBtn = createUIButton(
		t("title.credits"),
		vec2(constants.MIDDLE_SCREEN_X, baseY + spacing * 2),
		() => {
			openCredits();
		}
	);

	const backBtn = createUIButton(
		t("title.back"),
		vec2(constants.MIDDLE_SCREEN_X, baseY + spacing * 3),
		() => {
			hideOptionsSubmenu();
			TitleScene.showMainButtons();
		}
	);

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
