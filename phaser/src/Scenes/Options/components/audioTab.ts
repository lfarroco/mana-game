import { getOption, setOption } from "@Models/OptionsStore";
import { booleanOption } from "./booleanOption";
import { volumeOption } from "./volumeOption";


export function audioTab(startY: number, lineHeight: number) {
	return [
		booleanOption('Sound', startY,
			() => getOption('sound'),
			value => setOption('sound', value)
		),

		volumeOption('Sound Volume', startY + lineHeight,
			() => getOption('soundVolume'),
			value => setOption('soundVolume', value)
		),

		booleanOption('Music', startY + lineHeight * 2,
			() => getOption('music'),
			value => setOption('music', value)
		),

		volumeOption('Music Volume', startY + lineHeight * 3,
			() => getOption('musicVolume'),
			value => setOption('musicVolume', value)
		)
	].flat();

}
