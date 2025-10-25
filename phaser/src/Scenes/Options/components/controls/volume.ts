import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { BUTTONS, LAYOUT, STYLES } from "../../OptionsScene";

const VOLUME_STEP = 0.1
const VOLUME_MIN = 0
const VOLUME_MAX = 1

export function volume(
	label: string,
	yPos: number,
	getValue: () => number,
	setValue: (value: number) => void) {

	const formatLabel = (n: number) => Math.round(n * 100) + '%';
	const updateLabel = () => valueText.setText(formatLabel(getValue()));

	//   ~~~//~~~

	const title = io.Text(
		label,
		constants.titleTextConfig
	);
	io.SetPosition(title, vec2(constants.MIDDLE_SCREEN_X, yPos))
	io.Centralize(title);

	//   ~~~//~~~

	const minus = createUIButton(
		'-',
		vec2(constants.MIDDLE_SCREEN_X - BUTTONS.VOLUME_BUTTON_OFFSET_X, yPos + LAYOUT.VALUE_OFFSET_Y),
		() => {
			const newValue = Math.max(VOLUME_MIN, getValue() - VOLUME_STEP);
			setValue(newValue);
			updateLabel();
		},
		BUTTONS.VOLUME_BUTTON_WIDTH
	);

	//   ~~~//~~~

	const valueText = io.Text(
		formatLabel(getValue()),
		{
			...constants.titleTextConfig,
			color: STYLES.VALUE_TEXT_COLOR
		}
	);
	io.SetPosition(valueText, vec2(constants.MIDDLE_SCREEN_X, yPos + LAYOUT.VALUE_OFFSET_Y));
	io.Centralize(valueText);

	//   ~~~//~~~

	const plus = createUIButton(
		'+',
		vec2(
			constants.MIDDLE_SCREEN_X + BUTTONS.VOLUME_BUTTON_OFFSET_X,
			yPos + LAYOUT.VALUE_OFFSET_Y
		),
		() => {
			const newValue = Math.min(VOLUME_MAX, getValue() + VOLUME_STEP);
			setValue(newValue);
			updateLabel();
		},
		BUTTONS.VOLUME_BUTTON_WIDTH
	);

	//   ~~~//~~~

	return [
		title,
		minus.container,
		valueText,
		plus.container
	] as Phaser.GameObjects.GameObject[];
}
