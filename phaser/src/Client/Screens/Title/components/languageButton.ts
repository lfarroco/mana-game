import * as constants from "../../../../Constants";
import * as Geometry from "@Models/Geometry";
import * as UIButton from "@Components/Button/UIButton";
import * as LanguagePanel from "Client/Screens/Title/Components/LanguagePanel";
import * as i18n from "@i18n/i18n";

const BUTTON_X = 120;
const BUTTON_Y = constants.SCREEN_HEIGHT - 60;

export function create() {

	const currentLangName = i18n.getNativeName(i18n.getCurrentLocale());

	const button = UIButton.create({
		text: `あ/A ${currentLangName}`,
		position: Geometry.vec2(BUTTON_X, BUTTON_Y),
		callback: LanguagePanel.create,
		width: 200,
		tooltip: {
			title: i18n.t("language.title"),
			description: i18n.t("title.tooltip.language"),
			position: "right",
		},
	});

	return button;
}
