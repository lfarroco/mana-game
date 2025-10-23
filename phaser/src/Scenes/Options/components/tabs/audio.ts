import { getOption, setOption } from "@Models/OptionsStore";
import { boolean } from "../controls/boolean";
import { volume } from "../controls/volume";

export function audioTab(startY: number, lineHeight: number) {
	return [
		boolean('Sound', startY,
			() => getOption('sound'),
			value => setOption('sound', value)
		),

		volume('Sound Volume', startY + lineHeight,
			() => getOption('soundVolume'),
			value => setOption('soundVolume', value)
		),

		boolean('Music', startY + lineHeight * 2,
			() => getOption('music'),
			value => setOption('music', value)
		),

		volume('Music Volume', startY + lineHeight * 3,
			() => getOption('musicVolume'),
			value => setOption('musicVolume', value)
		)
	].flat();
}
