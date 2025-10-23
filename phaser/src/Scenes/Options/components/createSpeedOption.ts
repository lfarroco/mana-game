import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { createUIButton } from "@UI/UIButton";
import * as Phaser from "phaser";
import { BUTTONS, LAYOUT, ADJUSTMENTS, STYLES } from "../OptionsScene";


export function createSpeedOption(
	label: string,
	yPos: number,
	getValue: () => number,
	setValue: (value: number) => void
) {

	const formatLabel = () => getValue().toFixed(1) + 'x';
	const updateLabel = () => labelText.setText(formatLabel());

	//   ~~~//~~~
	const labelText = io.Text(
		vec2(constants.MIDDLE_SCREEN_X, yPos),
		label,
		constants.titleTextConfig
	);
	io.Centralize(labelText);

	//   ~~~//~~~
	const decreaseButton = createUIButton(
		'-',
		vec2(
			constants.MIDDLE_SCREEN_X - BUTTONS.SPEED_BUTTON_OFFSET_X,
			yPos + LAYOUT.SPEED_VALUE_OFFSET_Y
		),
		() => {
			const newValue = Math.max(ADJUSTMENTS.SPEED_MIN, getValue() - ADJUSTMENTS.SPEED_STEP);
			setValue(newValue);
			updateLabel();
		},
		BUTTONS.SPEED_BUTTON_WIDTH
	);

	//   ~~~//~~~
	const valueText = io.Text(
		vec2(constants.MIDDLE_SCREEN_X, yPos + LAYOUT.SPEED_VALUE_OFFSET_Y),
		formatLabel(),
		{
			...constants.titleTextConfig,
			color: STYLES.VALUE_TEXT_COLOR
		}
	);
	io.Centralize(valueText);

	//   ~~~//~~~
	const increaseButton = createUIButton(
		'+',
		vec2(constants.MIDDLE_SCREEN_X + BUTTONS.SPEED_BUTTON_OFFSET_X, yPos + LAYOUT.SPEED_VALUE_OFFSET_Y),
		() => {
			const newValue = Math.min(ADJUSTMENTS.SPEED_MAX, getValue() + ADJUSTMENTS.SPEED_STEP);
			setValue(newValue);
			updateLabel();
		},
		BUTTONS.SPEED_BUTTON_WIDTH
	);

	//   ~~~//~~~
	return [
		labelText, decreaseButton.container, valueText, increaseButton.container
	] as Phaser.GameObjects.GameObject[];
}
