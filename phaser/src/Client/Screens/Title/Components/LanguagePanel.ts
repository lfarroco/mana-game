import * as constants from "@Constants/constants";
import * as Geometry from "@Models/Geometry";
import * as UIButton from "Client/Components/UIButton";
import * as BackgroundOverlay from "Client/Components/BackgroundOverlay";
import * as Panel from "Client/Components/Panel";
import * as i18n from "@i18n/i18n";

let isOpen = false;
let container: Phaser.GameObjects.Container | null = null;
let overlay: ReturnType<typeof BackgroundOverlay.createBackgroundOverlay> | null = null;

export function openLanguagePanel(): void {
	if (isOpen) return;
	isOpen = true;

	const panelWidth = 400;
	const languages = i18n.getAvailableLocales();
	const panelHeight = Math.max(300, languages.length * 80 + 150);

	overlay = BackgroundOverlay.createBackgroundOverlay({
		alpha: 0.85,
		interactive: true,
	});
	overlay.show();

	const panel = Panel.createPanel(Geometry.vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y), {
		width: panelWidth,
		height: panelHeight,
	});

	const title = io.Title1(i18n.t("language.title"));
	io.SetPosition(
		title,
		Geometry.vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y - panelHeight / 2 + 40)
	);
	io.Centralize(title);

	const buttonYStart = constants.MIDDLE_SCREEN_Y - panelHeight / 2 + 100;
	const buttonSpacing = 70;

	const langButtons = languages.map((lang, index) => {
		return UIButton.createUIButton({
			text: i18n.getNativeName(lang),
			position: Geometry.vec2(constants.MIDDLE_SCREEN_X, buttonYStart + index * buttonSpacing),
			callback: () => {
				selectLanguage(lang);
			},
			width: 200,
		});
	});

	const closeButton = UIButton.createUIButton({
		text: i18n.t("language.close"),
		position: Geometry.vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + panelHeight / 2 - 50),
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
	i18n.setLocale(lang);
	io.scene.children.removeAll();
	io.screens.title();
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
