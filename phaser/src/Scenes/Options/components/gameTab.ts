import { getOption, setOption } from "@Models/OptionsStore";
import { booleanOption } from "./booleanOption";
import { createSpeedOption } from "./createSpeedOption";


export function gameTab(startY: number, lineHeight: number) {
	return [
		booleanOption('Debug', startY,
			() => getOption('debug', false),
			value => setOption('debug', value)
		),
		createSpeedOption('Speed', startY + lineHeight,
			() => getOption('speed', 1.0),
			value => setOption('speed', value)
		)
	].flat();
}
