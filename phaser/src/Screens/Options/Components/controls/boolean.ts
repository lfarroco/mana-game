import * as Constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import { BUTTONS, LAYOUT, STYLES } from "@Screens/Options/optionsConfig";
import * as i18n from "@i18n/i18n";
import { env } from "@Env";

export function boolean(
	label: string,
	yPos: number,
	getValue: () => boolean,
	setValue: (value: boolean) => void
) {
	const labelText = env.scene.add.text(0, 0, label, Constants.titleTextConfig);
	labelText.setPosition(Constants.MIDDLE_SCREEN_X, yPos);
	labelText.setOrigin(0.5);

	//   ~~~//~~~
	//   ~~~//~~~
	const onText = i18n.t("options.boolean.on");
	const offText = i18n.t("options.boolean.off");

	const valueText = env.scene.add.text(0, 0, getValue() ? onText : offText, {
		...Constants.titleTextConfig,
		fontSize: "12px",
		color: STYLES.VALUE_TEXT_COLOR,
	});
	valueText.setPosition(Constants.MIDDLE_SCREEN_X, yPos + LAYOUT.VALUE_OFFSET_Y);
	valueText.setOrigin(0.5);
	valueText.setVisible(false);

	//   ~~~//~~~

	const toggleButton = UIButton.create({
		text: getValue() ? onText : offText,
		position: [Constants.MIDDLE_SCREEN_X, yPos + LAYOUT.VALUE_OFFSET_Y],
		callback: () => {
			const newValue = !getValue();
			setValue(newValue);
			toggleButton.text.setText(newValue ? onText : offText);
		},
		width: BUTTONS.BOOLEAN_TOGGLE_WIDTH,
	});

	//   ~~~//~~~

	return [labelText, valueText, toggleButton.container] as Phaser.GameObjects.GameObject[];
}
