import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as BackgroundOverlay from "@Components/Overlay/BackgroundOverlay";
import * as Panel from "@Components/Panel/Panel";
import * as i18n from "@i18n/i18n";
import { ClientState } from "@Models/ClientState";

let isOpen = false;
let container: Phaser.GameObjects.Container | null = null;
let overlay: ReturnType<typeof BackgroundOverlay.create> | null = null;

export const create = (clientState: ClientState) => () => {
	if (isOpen) return;
	isOpen = true;

	const panelWidth = 400;
	const languages = i18n.getAvailableLocales();
	const panelHeight = Math.max(300, languages.length * 80 + 150);

	overlay = BackgroundOverlay.create({
		alpha: 0.85,
		interactive: true,
	});
	overlay.show();

	const panel = Panel.createPanel([constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y], {
		width: panelWidth,
		height: panelHeight,
	});

	const title = io.Title1(i18n.t("language.title"));
	io.SetPosition(
		title,
		[constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y - panelHeight / 2 + 40]
	);
	io.Centralize(title);

	const buttonYStart = constants.MIDDLE_SCREEN_Y - panelHeight / 2 + 100;
	const buttonSpacing = 70;

	const langButtons = languages.map((lang, index) => {
		return UIButton.create({
			text: i18n.getNativeName(lang),
			position: [constants.MIDDLE_SCREEN_X, buttonYStart + index * buttonSpacing],
			callback: () => {
				selectLanguage(clientState, lang);
			},
			width: 200,
		});
	});

	const closeButton = UIButton.create({
		text: i18n.t("language.close"),
		position: [constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + panelHeight / 2 - 50],
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

function selectLanguage(clientState: ClientState, lang: string) {
	i18n.setLocale(lang);
	io.scene.children.removeAll();
	io.screens.title.create(clientState);
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
