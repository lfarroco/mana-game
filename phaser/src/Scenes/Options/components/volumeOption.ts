import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { createUIButton } from "@UI/UIButton";
import { BUTTONS, LAYOUT, ADJUSTMENTS, STYLES } from "../OptionsScene";

export function volumeOption(
	label: string,
	yPos: number,
	getValue: () => number,
	setValue: (value: number) => void) {

	const formatLabel = (n: number) => Math.round(n * 100) + '%';
	const updateLabel = () => valueText.setText(formatLabel(getValue()));

	//   ~~~//~~~

	const title = io.Text(
		vec2(constants.MIDDLE_SCREEN_X, yPos),
		label,
		constants.titleTextConfig
	);
	io.Centralize(title);

	//   ~~~//~~~

	const minus = createUIButton(
		'-',
		vec2(constants.MIDDLE_SCREEN_X - BUTTONS.VOLUME_BUTTON_OFFSET_X, yPos + LAYOUT.VALUE_OFFSET_Y),
		() => {
			const newValue = Math.max(ADJUSTMENTS.VOLUME_MIN, getValue() - ADJUSTMENTS.VOLUME_STEP);
			setValue(newValue);
			updateLabel();
		},
		BUTTONS.VOLUME_BUTTON_WIDTH
	);

	//   ~~~//~~~

	const valueText = io.Text(
		vec2(constants.MIDDLE_SCREEN_X, yPos + LAYOUT.VALUE_OFFSET_Y),
		formatLabel(getValue()),
		{
			...constants.titleTextConfig,
			color: STYLES.VALUE_TEXT_COLOR
		}
	);
	io.Centralize(valueText);

	//   ~~~//~~~

	const plus = createUIButton(
		'+',
		vec2(
			constants.MIDDLE_SCREEN_X + BUTTONS.VOLUME_BUTTON_OFFSET_X,
			yPos + LAYOUT.VALUE_OFFSET_Y
		),
		() => {
			const newValue = Math.min(ADJUSTMENTS.VOLUME_MAX, getValue() + ADJUSTMENTS.VOLUME_STEP);
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
