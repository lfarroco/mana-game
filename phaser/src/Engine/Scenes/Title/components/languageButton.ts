import { getCurrentLocale, getNativeName } from "@i18n/i18n";
import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { openLanguagePanel } from "@Scenes/Title/components/LanguagePanel";
import { t } from "@i18n/i18n";

export function languageButton() {
	const x = 120;
	const y = constants.SCREEN_HEIGHT - 60;

	const currentLangName = getNativeName(getCurrentLocale());

	const button = createUIButton(`あ/A ${currentLangName}`, vec2(x, y), openLanguagePanel, 200, undefined, {
		title: t("language.title"),
		description: t("title.tooltip.language"),
		position: "right",
	});

	return button;
}
