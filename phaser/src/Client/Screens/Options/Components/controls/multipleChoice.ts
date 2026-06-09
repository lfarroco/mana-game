import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as OptionsScreen from "@Screens/Options/OptionsScreen";

export function multipleChoice(
	label: string,
	yPos: number,
	choices: string[],
	getValue: () => string,
	setValue: (value: string) => void,
	valueLabeler?: (value: string) => string
) {
	const formatLabel = () => (valueLabeler ? valueLabeler(getValue()) : getValue().toUpperCase());
	const updateLabel = () => valueText.setText(formatLabel());

	//   ~~~//~~~
	const labelText = io.Text(label, constants.titleTextConfig);

	io.SetPosition(labelText, [constants.MIDDLE_SCREEN_X, yPos]);
	io.Centralize(labelText);

	//   ~~~//~~~
	const decreaseButton = UIButton.create({
		text: "<",
		position: [constants.MIDDLE_SCREEN_X - OptionsScreen.BUTTONS.MULTICHOICE_BUTTON_OFFSET_X, yPos + OptionsScreen.LAYOUT.MULTICHOICE_VALUE_OFFSET_Y],
		callback: () => {
			const currentIndex = choices.indexOf(getValue());
			const newIndex = currentIndex > 0 ? currentIndex - 1 : choices.length - 1;
			setValue(choices[newIndex]);
			updateLabel();
		},
		width: OptionsScreen.BUTTONS.MULTICHOICE_BUTTON_WIDTH,
	});

	//   ~~~//~~~
	const valueText = io.Text(formatLabel(), {
		...constants.titleTextConfig,
		fontSize: "32px",
		color: OptionsScreen.STYLES.VALUE_TEXT_COLOR,
	});

	io.SetPosition(
		valueText,
		[constants.MIDDLE_SCREEN_X, yPos + OptionsScreen.LAYOUT.MULTICHOICE_VALUE_OFFSET_Y]
	);
	io.Centralize(valueText);

	//   ~~~//~~~
	const increaseButton = UIButton.create({
		text: ">",
		position: [
			constants.MIDDLE_SCREEN_X + OptionsScreen.BUTTONS.MULTICHOICE_BUTTON_OFFSET_X,
			yPos + OptionsScreen.LAYOUT.MULTICHOICE_VALUE_OFFSET_Y
		],
		callback: () => {
			const currentIndex = choices.indexOf(getValue());
			const newIndex = currentIndex < choices.length - 1 ? currentIndex + 1 : 0;
			setValue(choices[newIndex]);
			updateLabel();
		},
		width: OptionsScreen.BUTTONS.MULTICHOICE_BUTTON_WIDTH,
	});

	//   ~~~//~~~
	return [
		labelText,
		decreaseButton.container,
		valueText,
		increaseButton.container,
	] as Phaser.GameObjects.GameObject[];
}
