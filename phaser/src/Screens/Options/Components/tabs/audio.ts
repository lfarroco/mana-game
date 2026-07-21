import { getSettings, setOption } from "@Models/OptionsStore";
import { boolean } from "@Screens/Options/Components/controls/boolean";
import { volume } from "@Screens/Options/Components/controls/volume";
import { t } from "@i18n/i18n";

export function audioTab(startY: number, lineHeight: number) {
	const settings = getSettings();
	return [
		volume(
			t("options.audio.masterVolume"),
			startY,
			() => settings.masterVolume,
			(value) => setOption("masterVolume", value)
		),

		boolean(
			t("options.audio.sound"),
			startY + lineHeight,
			() => settings.sound,
			(value) => setOption("sound", value)
		),

		volume(
			t("options.audio.soundVolume"),
			startY + lineHeight * 2,
			() => settings.soundVolume,
			(value) => setOption("soundVolume", value)
		),

		boolean(
			t("options.audio.music"),
			startY + lineHeight * 3,
			() => settings.music,
			(value) => setOption("music", value)
		),

		volume(
			t("options.audio.musicVolume"),
			startY + lineHeight * 4,
			() => settings.musicVolume,
			(value) => setOption("musicVolume", value)
		),
	].flat();
}
