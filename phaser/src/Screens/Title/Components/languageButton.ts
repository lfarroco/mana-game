import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as TitleScreen from "../TitleScreen";
import * as i18n from "@i18n/i18n";

const BUTTON_X = 120;
const BUTTON_Y = constants.SCREEN_HEIGHT - 60;

export function create(ctx: TitleScreen.Context) {
	const currentLangName = i18n.getNativeName(i18n.getCurrentLocale());

	const button = UIButton.create({
		text: `あ/A ${currentLangName}`,
		position: [BUTTON_X, BUTTON_Y],
		callback: () => {
			void ctx.go("language");
		},
		width: 200,
		tooltip: {
			title: i18n.t("language.title"),
			description: i18n.t("title.tooltip.language"),
			position: "right",
		},
	});

	return button.container;
}
