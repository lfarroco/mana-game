import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { createSlider } from "@Components/Slider";
import * as Phaser from "phaser";
import { LAYOUT, STYLES } from "Client/Screens/Options/OptionsScene";

const SPEED_STEP = 0.1;
const SPEED_MIN = 0.1;
const SPEED_MAX = 3.0;
const SLIDER_WIDTH = 280;

export function speed(
	label: string,
	yPos: number,
	getValue: () => number,
	setValue: (value: number) => void
) {
	const formatLabel = (n: number) => n.toFixed(1) + "x";

	//   ~~~//~~~
	const labelText = io.Text(label, constants.titleTextConfig);

	io.SetPosition(labelText, vec2(constants.MIDDLE_SCREEN_X, yPos));
	io.Centralize(labelText);

	//   ~~~//~~~
	const valueText = io.Text(formatLabel(getValue()), {
		...constants.titleTextConfig,
		color: STYLES.VALUE_TEXT_COLOR,
	});

	io.SetPosition(
		valueText,
		vec2(constants.MIDDLE_SCREEN_X, yPos + LAYOUT.SPEED_VALUE_OFFSET_Y - 20)
	);
	io.Centralize(valueText);

	//   ~~~//~~~
	const slider = createSlider(
		vec2(constants.MIDDLE_SCREEN_X, yPos + LAYOUT.SPEED_VALUE_OFFSET_Y + 20),
		{
			width: SLIDER_WIDTH,
			min: SPEED_MIN,
			max: SPEED_MAX,
			step: SPEED_STEP,
			initialValue: getValue(),
			onChange: (value) => {
				setValue(value);
				valueText.setText(formatLabel(value));
			},
		}
	);

	//   ~~~//~~~
	return [labelText, valueText, slider.container] as Phaser.GameObjects.GameObject[];
}
