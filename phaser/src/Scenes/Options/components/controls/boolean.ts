import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { createUIButton } from "@Components/UIButton";
import { LAYOUT, STYLES, BUTTONS } from "../../OptionsScene";

export function boolean(
	label: string,
	yPos: number,
	getValue: () => boolean,
	setValue: (value: boolean) => void
) {
	const labelText = io.Text(
		label,
		constants.titleTextConfig
	);
	io.SetPosition(labelText, vec2(constants.MIDDLE_SCREEN_X, yPos));
	io.Centralize(labelText);

	//   ~~~//~~~

	const valueText = io.Text(
		getValue() ? 'ON' : 'OFF',
		{
			...constants.titleTextConfig,
			fontSize: '12px',
			color: STYLES.VALUE_TEXT_COLOR
		}
	);
	io.SetPosition(valueText, vec2(constants.MIDDLE_SCREEN_X, yPos + LAYOUT.VALUE_OFFSET_Y))
	io.Centralize(valueText);
	io.Hide(valueText);

	//   ~~~//~~~

	const toggleButton = createUIButton(
		getValue() ? 'ON' : 'OFF',
		vec2(
			constants.MIDDLE_SCREEN_X,
			yPos + LAYOUT.VALUE_OFFSET_Y
		),
		() => {
			const newValue = !getValue();
			setValue(newValue);
			io.SetText(toggleButton.text, newValue ? 'ON' : 'OFF');
		},
		BUTTONS.BOOLEAN_TOGGLE_WIDTH
	);

	//   ~~~//~~~

	return [
		labelText,
		valueText,
		toggleButton.container
	] as Phaser.GameObjects.GameObject[];
}
