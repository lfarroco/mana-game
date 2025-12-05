import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { openOptions } from "../effects/openOptions";
import { openCredits } from "./CreditsPanel";
import { openStats } from "./StatsPanel";
import * as io from "@PhaserIO";

let submenuContainer: Container | null = null;
let mainButtonsContainer: Container | null = null;

export function optionsButton(y: number) {
	const button = createUIButton(
		"OPTIONS",
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
		"SETTINGS",
		vec2(constants.MIDDLE_SCREEN_X, baseY),
		() => {
			hideOptionsSubmenu();
			openOptions();
		}
	);

	const statsBtn = createUIButton(
		"STATS",
		vec2(constants.MIDDLE_SCREEN_X, baseY + spacing),
		() => {
			openStats();
		}
	);

	const creditsBtn = createUIButton(
		"CREDITS",
		vec2(constants.MIDDLE_SCREEN_X, baseY + spacing * 2),
		() => {
			openCredits();
		}
	);

	const backBtn = createUIButton(
		"BACK",
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

function hideMainButtons() {
	if (mainButtonsContainer) {
		mainButtonsContainer.setVisible(false);
	}
}

function showMainButtons() {
	if (mainButtonsContainer) {
		mainButtonsContainer.setVisible(true);
	}
}
