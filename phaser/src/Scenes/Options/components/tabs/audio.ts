import { getOption, setOption } from "@Models/OptionsStore";
import { boolean } from "../controls/boolean";
import { volume } from "../controls/volume";
import { t } from "@i18n/i18n";

export function audioTab(startY: number, lineHeight: number) {
	return [
		volume(
			t("options.audio.masterVolume"),
			startY,
			() => getOption("masterVolume"),
			(value) => setOption("masterVolume", value)
		),

		boolean(
			t("options.audio.sound"),
			startY + lineHeight,
			() => getOption("sound"),
			(value) => setOption("sound", value)
		),

		volume(
			t("options.audio.soundVolume"),
			startY + lineHeight * 2,
			() => getOption("soundVolume"),
			(value) => setOption("soundVolume", value)
		),

		boolean(
			t("options.audio.music"),
			startY + lineHeight * 3,
			() => getOption("music"),
			(value) => setOption("music", value)
		),

		volume(
			t("options.audio.musicVolume"),
			startY + lineHeight * 4,
			() => getOption("musicVolume"),
			(value) => setOption("musicVolume", value)
		),
	].flat();
}
