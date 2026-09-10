import * as constants from "@Constants";
import * as Slider from "@Components/Slider/Slider";
import * as Phaser from "phaser";
import { LAYOUT, STYLES } from "@Screens/Options/optionsConfig";
import { env } from "@Env";

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
	const labelText = env.scene.add.text(0, 0, label, constants.titleTextConfig);

	labelText.setPosition(constants.MIDDLE_SCREEN_X, yPos);
	labelText.setOrigin(0.5);

	//   ~~~//~~~
	const valueText = env.scene.add.text(0, 0, formatLabel(getValue()), {
		...constants.titleTextConfig,
		color: STYLES.VALUE_TEXT_COLOR,
	});

	valueText.setPosition(constants.MIDDLE_SCREEN_X, yPos + LAYOUT.SPEED_VALUE_OFFSET_Y - 20);
	valueText.setOrigin(0.5);

	//   ~~~//~~~
	const slider = Slider.createSlider(
		[constants.MIDDLE_SCREEN_X, yPos + LAYOUT.SPEED_VALUE_OFFSET_Y + 20],
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
