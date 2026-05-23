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
	const languages = getAvailableLocales();
	const panelHeight = Math.max(300, languages.length * 80 + 150);

	overlay = createBackgroundOverlay({
		alpha: 0.85,
		interactive: true,
	});
	overlay.show();

	const panel = createPanel(vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y), {
		width: panelWidth,
		height: panelHeight,
	});

	const title = io.Title1(t("language.title"));
	io.SetPosition(
		title,
		vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y - panelHeight / 2 + 40)
	);
	io.Centralize(title);

	const buttonYStart = constants.MIDDLE_SCREEN_Y - panelHeight / 2 + 100;
	const buttonSpacing = 70;

	const langButtons = languages.map((lang, index) => {
		return createUIButton({
			text: getNativeName(lang),
			position: vec2(constants.MIDDLE_SCREEN_X, buttonYStart + index * buttonSpacing),
			callback: () => {
				selectLanguage(lang);
			},
			width: 200,
		});
	});

	const closeButton = createUIButton({
		text: t("language.close"),
		position: vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + panelHeight / 2 - 50),
		callback: () => {
			closeLanguagePanel();
		},
		width: 150,
	});

	container = io.Container([
		panel.container,
		title,
		...langButtons.map((b) => b.container),
		closeButton.container,
	]);

	io.BringToTop(container);
}

function selectLanguage(lang: string) {
	setLocale(lang);
	getCurrentScene().scene.restart();
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
