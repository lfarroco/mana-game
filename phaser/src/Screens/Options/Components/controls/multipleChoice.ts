import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as OptionsScreen from "@Screens/Options/OptionsScreen";
import { env } from "@Env";

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
	const labelText = env.scene.add.text(0, 0, label, constants.titleTextConfig);

	labelText.setPosition(constants.MIDDLE_SCREEN_X, yPos);
	labelText.setOrigin(0.5);

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
	const valueText = env.scene.add.text(0, 0, formatLabel(), {
		...constants.titleTextConfig,
		fontSize: "32px",
		color: OptionsScreen.STYLES.VALUE_TEXT_COLOR,
	});

	valueText.setPosition(
		constants.MIDDLE_SCREEN_X, yPos + OptionsScreen.LAYOUT.MULTICHOICE_VALUE_OFFSET_Y
	);
	valueText.setOrigin(0.5);

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
