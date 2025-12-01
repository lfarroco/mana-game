import { getOption, setOption } from "@Models/OptionsStore";
import { boolean } from "../controls/boolean";
import { volume } from "../controls/volume";

export function audioTab(startY: number, lineHeight: number) {
	return [
		volume(
			"Master Volume",
			startY,
			() => getOption("masterVolume"),
			(value) => setOption("masterVolume", value)
		),

		boolean(
			"Sound",
			startY + lineHeight,
			() => getOption("sound"),
			(value) => setOption("sound", value)
		),

		volume(
			"Sound Volume",
			startY + lineHeight * 2,
			() => getOption("soundVolume"),
			(value) => setOption("soundVolume", value)
		),

		boolean(
			"Music",
			startY + lineHeight * 3,
			() => getOption("music"),
			(value) => setOption("music", value)
		),

		volume(
			"Music Volume",
			startY + lineHeight * 4,
			() => getOption("musicVolume"),
			(value) => setOption("musicVolume", value)
		),
	].flat();
}
