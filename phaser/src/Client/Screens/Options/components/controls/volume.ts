import * as constants from "@Constants";
import * as Slider from "@Components/Slider/Slider";
import * as OptionsScreen from "@Screens/Options/OptionsScreen";

const VOLUME_STEP = 0.1;
const VOLUME_MIN = 0;
const VOLUME_MAX = 1;
const SLIDER_WIDTH = 280;

export function volume(
	label: string,
	yPos: number,
	getValue: () => number,
	setValue: (value: number) => void
) {
	const formatLabel = (n: number) => Math.round(n * 100) + "%";

	//   ~~~//~~~

	const title = io.Text(label, constants.titleTextConfig);
	io.SetPosition(title, [constants.MIDDLE_SCREEN_X, yPos]);
	io.Centralize(title);

	//   ~~~//~~~

	const valueText = io.Text(formatLabel(getValue()), {
		...constants.titleTextConfig,
		color: OptionsScreen.STYLES.VALUE_TEXT_COLOR,
	});
	io.SetPosition(valueText, [constants.MIDDLE_SCREEN_X, yPos + OptionsScreen.LAYOUT.VALUE_OFFSET_Y - 20]);
	io.Centralize(valueText);

	//   ~~~//~~~

	const slider = Slider.createSlider([constants.MIDDLE_SCREEN_X, yPos + OptionsScreen.LAYOUT.VALUE_OFFSET_Y + 20], {
		width: SLIDER_WIDTH,
		min: VOLUME_MIN,
		max: VOLUME_MAX,
		step: VOLUME_STEP,
		initialValue: getValue(),
		onChange: (value) => {
			setValue(value);
			valueText.setText(formatLabel(value));
		},
	});

	//   ~~~//~~~

	return [title, valueText, slider.container] as Phaser.GameObjects.GameObject[];
}
