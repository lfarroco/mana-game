import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import * as Phaser from "phaser";
import { BUTTONS, LAYOUT, STYLES } from "../../OptionsScene";

const SPEED_STEP = 0.1;
const SPEED_MIN = 0.1;
const SPEED_MAX = 3.0;

export function speed(
	label: string,
	yPos: number,
	getValue: () => number,
	setValue: (value: number) => void
) {
	const formatLabel = () => getValue().toFixed(1) + "x";
	const updateLabel = () => valueText.setText(formatLabel());

	//   ~~~//~~~
	const labelText = io.Text(label, constants.titleTextConfig);

	io.SetPosition(labelText, vec2(constants.MIDDLE_SCREEN_X, yPos));
	io.Centralize(labelText);

	//   ~~~//~~~
	const decreaseButton = createUIButton(
		"-",
		vec2(
			constants.MIDDLE_SCREEN_X - BUTTONS.SPEED_BUTTON_OFFSET_X,
			yPos + LAYOUT.SPEED_VALUE_OFFSET_Y
		),
		() => {
			const newValue = Math.max(SPEED_MIN, getValue() - SPEED_STEP);
			setValue(newValue);
			updateLabel();
		},
		BUTTONS.SPEED_BUTTON_WIDTH
	);

	//   ~~~//~~~
	const valueText = io.Text(formatLabel(), {
		...constants.titleTextConfig,
		color: STYLES.VALUE_TEXT_COLOR,
	});

	io.SetPosition(valueText, vec2(constants.MIDDLE_SCREEN_X, yPos + LAYOUT.SPEED_VALUE_OFFSET_Y));
	io.Centralize(valueText);

	//   ~~~//~~~
	const increaseButton = createUIButton(
		"+",
		vec2(
			constants.MIDDLE_SCREEN_X + BUTTONS.SPEED_BUTTON_OFFSET_X,
			yPos + LAYOUT.SPEED_VALUE_OFFSET_Y
		),
		() => {
			const newValue = Math.min(SPEED_MAX, getValue() + SPEED_STEP);
			setValue(newValue);
			updateLabel();
		},
		BUTTONS.SPEED_BUTTON_WIDTH
	);

	//   ~~~//~~~
	return [
		labelText,
		decreaseButton.container,
		valueText,
		increaseButton.container,
	] as Phaser.GameObjects.GameObject[];
}
