import * as Constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as OptionsScreen from "@Screens/Options/OptionsScreen";
import * as i18n from "@i18n/i18n";

export function boolean(
	label: string,
	yPos: number,
	getValue: () => boolean,
	setValue: (value: boolean) => void
) {
	const labelText = io.Text(label, Constants.titleTextConfig);
	io.SetPosition(labelText, [Constants.MIDDLE_SCREEN_X, yPos]);
	io.Centralize(labelText);

	//   ~~~//~~~
	//   ~~~//~~~
	const onText = i18n.t("options.boolean.on");
	const offText = i18n.t("options.boolean.off");

	const valueText = io.Text(getValue() ? onText : offText, {
		...Constants.titleTextConfig,
		fontSize: "12px",
		color: OptionsScreen.STYLES.VALUE_TEXT_COLOR,
	});
	io.SetPosition(valueText, [Constants.MIDDLE_SCREEN_X, yPos + OptionsScreen.LAYOUT.VALUE_OFFSET_Y]);
	io.Centralize(valueText);
	io.Hide(valueText);

	//   ~~~//~~~

	const toggleButton = UIButton.create({
		text: getValue() ? onText : offText,
		position: [
			Constants.MIDDLE_SCREEN_X,
			yPos + OptionsScreen.LAYOUT.VALUE_OFFSET_Y
		],
		callback: () => {
			const newValue = !getValue();
			setValue(newValue);
			toggleButton.text.setText(newValue ? onText : offText);
		},
		width: OptionsScreen.BUTTONS.BOOLEAN_TOGGLE_WIDTH,
	});

	//   ~~~//~~~

	return [labelText, valueText, toggleButton.container] as Phaser.GameObjects.GameObject[];
}
