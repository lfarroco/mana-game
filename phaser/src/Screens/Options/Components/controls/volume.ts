import * as constants from "@Constants";
import * as Slider from "@Components/Slider/Slider";
import * as OptionsScreen from "@Screens/Options/OptionsScreen";
import { env } from "@Env";

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

	const title = env.scene.add.text(0, 0, label, constants.titleTextConfig);
	title.setPosition(constants.MIDDLE_SCREEN_X, yPos);
	title.setOrigin(0.5);

	//   ~~~//~~~

	const valueText = env.scene.add.text(0, 0, formatLabel(getValue()), {
		...constants.titleTextConfig,
		color: OptionsScreen.STYLES.VALUE_TEXT_COLOR,
	});
	valueText.setPosition(constants.MIDDLE_SCREEN_X, yPos + OptionsScreen.LAYOUT.VALUE_OFFSET_Y - 20);
	valueText.setOrigin(0.5);

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
