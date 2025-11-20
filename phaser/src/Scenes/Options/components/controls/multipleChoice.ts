import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import * as Phaser from "phaser";
import { BUTTONS, LAYOUT, STYLES } from "../../OptionsScene";

export function multipleChoice(
	label: string,
	yPos: number,
	choices: string[],
	getValue: () => string,
	setValue: (value: string) => void
) {
	const formatLabel = () => getValue().toUpperCase();
	const updateLabel = () => valueText.setText(formatLabel());

	//   ~~~//~~~
	const labelText = io.Text(label, constants.titleTextConfig);

	io.SetPosition(labelText, vec2(constants.MIDDLE_SCREEN_X, yPos));
	io.Centralize(labelText);

	//   ~~~//~~~
	const decreaseButton = createUIButton(
		"<",
		vec2(
			constants.MIDDLE_SCREEN_X - BUTTONS.MULTICHOICE_BUTTON_OFFSET_X,
			yPos + LAYOUT.MULTICHOICE_VALUE_OFFSET_Y
		),
		() => {
			const currentIndex = choices.indexOf(getValue());
			const newIndex = currentIndex > 0 ? currentIndex - 1 : choices.length - 1;
			setValue(choices[newIndex]);
			updateLabel();
		},
		BUTTONS.MULTICHOICE_BUTTON_WIDTH
	);

	//   ~~~//~~~
	const valueText = io.Text(formatLabel(), {
		...constants.titleTextConfig,
		fontSize: "32px",
		color: STYLES.VALUE_TEXT_COLOR,
	});

	io.SetPosition(
		valueText,
		vec2(constants.MIDDLE_SCREEN_X, yPos + LAYOUT.MULTICHOICE_VALUE_OFFSET_Y)
	);
	io.Centralize(valueText);

	//   ~~~//~~~
	const increaseButton = createUIButton(
		">",
		vec2(
			constants.MIDDLE_SCREEN_X + BUTTONS.MULTICHOICE_BUTTON_OFFSET_X,
			yPos + LAYOUT.MULTICHOICE_VALUE_OFFSET_Y
		),
		() => {
			const currentIndex = choices.indexOf(getValue());
			const newIndex = currentIndex < choices.length - 1 ? currentIndex + 1 : 0;
			setValue(choices[newIndex]);
			updateLabel();
		},
		BUTTONS.MULTICHOICE_BUTTON_WIDTH
	);

	//   ~~~//~~~
	return [
		labelText,
		decreaseButton.container,
		valueText,
		increaseButton.container,
	] as Phaser.GameObjects.GameObject[];
}
