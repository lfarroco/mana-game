import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as BackgroundOverlay from "@Components/Overlay/BackgroundOverlay";
import * as Panel from "@Components/Panel/Panel";
import * as i18n from "@i18n/i18n";
import * as TitleScreen from "../TitleScreen";
import { env } from "@Env";

/**
 * Render the language selection panel as TitleScreen's "language" phase.
 * The overlay and panel are tracked by the phase tracker and destroyed
 * automatically on the next transition.
 *
 * Selecting a language emits localeChanged (GameEvent), which triggers
 * in-place text refresh for persistent elements like howToPlay.
 */
export function create(ctx: TitleScreen.Context) {
	const panelWidth = 400;
	const languages = i18n.getAvailableLocales();
	const panelHeight = Math.max(300, languages.length * 80 + 150);

	const overlay = BackgroundOverlay.create({
		alpha: 0.85,
		interactive: true,
	});
	overlay.show();
	ctx.track(overlay, { id: TitleScreen.TITLE_IDS.languageOverlay });

	const panel = Panel.createPanel([constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y], {
		width: panelWidth,
		height: panelHeight,
	});

	const title = env.scene.add.text(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y - panelHeight / 2 + 40, i18n.t("language.title"), constants.titleTextConfig).setOrigin(0.5);

	const buttonYStart = constants.MIDDLE_SCREEN_Y - panelHeight / 2 + 100;
	const buttonSpacing = 70;

	const langButtons = languages.map((lang, index) => {
		return UIButton.create({
			text: i18n.getNativeName(lang),
			position: [constants.MIDDLE_SCREEN_X, buttonYStart + index * buttonSpacing],
			callback: () => {
				selectLanguage(lang);
			},
			width: 200,
		});
	});

	const closeButton = UIButton.create({
		text: i18n.t("language.close"),
		position: [constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + panelHeight / 2 - 50],
		callback: () => {
			void ctx.go("main");
		},
		width: 150,
	});

	const container = env.container([
		panel.container,
		title,
		...langButtons.map((b) => b.container),
		closeButton.container,
	]);
	ctx.track(container, { id: TitleScreen.TITLE_IDS.languagePanel });

	env.scene.children.bringToTop(container);

	function selectLanguage(lang: string) {
		i18n.setLocale(lang);
		// i18n.setLocale emits localeChanged → persistent elements (e.g. howToPlay) refresh in-place.
		void ctx.go("main");
	}
}
