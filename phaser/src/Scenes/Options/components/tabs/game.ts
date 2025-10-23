import { getOption, setOption } from "@Models/OptionsStore";
import { boolean } from "../controls/boolean";
import { speed } from "../controls/speed";


export function gameTab(startY: number, lineHeight: number) {
	return [
		boolean('Debug', startY,
			() => getOption('debug', false),
			value => setOption('debug', value)
		),
		speed('Speed', startY + lineHeight,
			() => getOption('speed', 1.0),
			value => setOption('speed', value)
		)
	].flat();
}
