import { getOption, setOption } from "@Models/OptionsStore";
import { boolean } from "../controls/boolean";
import { speed } from "../controls/speed";
import { t } from "@i18n/i18n";

export function gameTab(startY: number, lineHeight: number) {
	return [
		boolean(
			t("options.game.debug"),
			startY,
			() => getOption("debug", false),
			(value) => setOption("debug", value)
		),
		speed(
			t("options.game.speed"),
			startY + lineHeight,
			() => getOption("speed", 1.0),
			(value) => setOption("speed", value)
		),
		boolean(
			t("options.game.compactTooltips"),
			startY + lineHeight * 2,
			() => getOption("compactTooltips", false),
			(value) => setOption("compactTooltips", value)
		),
	].flat();
}
