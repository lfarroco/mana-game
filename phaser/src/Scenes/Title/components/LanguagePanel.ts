import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { createBackgroundOverlay } from "@Components/BackgroundOverlay";
import { createPanel } from "@Components/Panel";
import { getAvailableLocales, setLocale, getNativeName, t } from "@i18n/i18n";

let isOpen = false;
let container: Phaser.GameObjects.Container | null = null;
let overlay: ReturnType<typeof createBackgroundOverlay> | null = null;

export function openLanguagePanel(): void {
	if (isOpen) return;
	isOpen = true;

	const panelWidth = 400;
	// Dynamic height based on number of languages, minimum 300
	const languages = getAvailableLocales();
	const panelHeight = Math.max(300, languages.length * 80 + 150);

	// Create overlay
	overlay = createBackgroundOverlay({
		alpha: 0.85,
		interactive: true
	});
	overlay.show();

	// Create panel
	const panel = createPanel(
		vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y),
		{ width: panelWidth, height: panelHeight }
	);

	// Title
	const title = io.Title1(t("language.title"));
	io.SetPosition(title, vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y - panelHeight / 2 + 40));
	io.Centralize(title);

	// Language Buttons
	const buttonYStart = constants.MIDDLE_SCREEN_Y - panelHeight / 2 + 100;
	const buttonSpacing = 70;

	const langButtons = languages.map((lang, index) => {
		return createUIButton(
			getNativeName(lang),
			vec2(constants.MIDDLE_SCREEN_X, buttonYStart + index * buttonSpacing),
			() => {
				selectLanguage(lang);
			},
			200 // Width
		);
	});

	// Close Button
	const closeButton = createUIButton(
		t("language.close"),
		vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + panelHeight / 2 - 50),
		() => {
			closeLanguagePanel();
		},
		150
	);

	container = io.Container([
		panel.container,
		title,
		...langButtons.map(b => b.container),
		closeButton.container
	]);

	io.BringToTop(container);
}

function selectLanguage(lang: string) {
	setLocale(lang);
	// Restart the scene to apply changes
	getCurrentScene().scene.restart();
	// Reset local state since scene is restarting
	isOpen = false;
	container = null;
	overlay = null;
}

function closeLanguagePanel() {
	if (container) {
		container.destroy(true);
		container = null;
	}
	if (overlay) {
		overlay.destroy();
		overlay = null;
	}
	isOpen = false;
}
