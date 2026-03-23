import * as constants from "@Constants/constants";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { openOptions } from "@Scenes/Title/effects/openOptions";
import { openCredits } from "@Scenes/Title/components/CreditsPanel";
import { openStats } from "@Scenes/Title/components/StatsPanel";
import * as io from "@PhaserIO";
import { getCloudsBg } from "@Scenes/Title/components/cloudsBg";

let submenuContainer: Container | null = null;
let mainButtonsContainer: Container | null = null;

export function optionsButton(y: number) {
	const button = createUIButton(
		t("title.options"),
		vec2(constants.MIDDLE_SCREEN_X, y),
		showOptionsSubmenu
	);
	return button;
}

function showOptionsSubmenu() {
	if (submenuContainer) return; // Already showing

	// Hide main buttons
	hideMainButtons();

	// Create submenu buttons
	const baseY = 500;
	const spacing = 90;

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
			showMainButtons();
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
	if (submenuContainer) {
		submenuContainer.destroy(true);
		submenuContainer = null;
	}
}

export function setMainButtonsContainer(container: Container) {
	mainButtonsContainer = container;
}

export function hideMainButtons() {
	if (mainButtonsContainer) {
		mainButtonsContainer.setVisible(false);
	}
}

export function showMainButtons() {
	if (mainButtonsContainer) {
		mainButtonsContainer.setVisible(true);
	}
}
