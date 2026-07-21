import { getSettings, setOption } from "@Models/OptionsStore";
import { boolean } from "@Screens/Options/Components/controls/boolean";
import { speed } from "@Screens/Options/Components/controls/speed";
import { t } from "@i18n/i18n";

export function gameTab(startY: number, lineHeight: number) {
	const settings = getSettings();
	return [
		boolean(
			t("options.game.debug"),
			startY,
			() => settings.debug,
			(value) => setOption("debug", value)
		),
		speed(
			t("options.game.speed"),
			startY + lineHeight,
			() => settings.speed,
			(value) => setOption("speed", value)
		),
		boolean(
			t("options.game.compactTooltips"),
			startY + lineHeight * 2,
			() => settings.compactTooltips,
			(value) => setOption("compactTooltips", value)
		),
	].flat();
}
