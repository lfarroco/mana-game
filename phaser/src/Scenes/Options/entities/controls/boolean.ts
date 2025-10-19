import { MIDDLE_SCREEN_X, titleTextConfig } from "@Constants/constants";
import { Entity } from "@Models/Entities/Entity";
import { vec2 } from "@Models/Geometry";
import { AddChildren, Container, SetText, Text } from "@PhaserIO";
import { createUIButton } from "@UI/UIButton";

function create(
	label: string,
	yPos: number,
	getValue: () => boolean,
	setValue: (value: boolean) => void,
) {

	const container = Container();

	const labelText = Text(
		vec2(MIDDLE_SCREEN_X, yPos),
		label,
		titleTextConfig
	).setOrigin(0.5);

	const valueText = Text(
		vec2(MIDDLE_SCREEN_X, yPos + 200),

		//yPos + VALUE_OFFSET_Y,
		getValue() ? 'ON' : 'OFF',
		{
			...titleTextConfig,
			fontSize: '12px',
			//color: STYLES.VALUE_TEXT_COLOR
		}
	).setOrigin(0.5).setAlpha(0);


	const toggleButton = createUIButton(
		getValue() ? 'ON' : 'OFF',
		vec2(
			MIDDLE_SCREEN_X,
			200
			//yPos + LAYOUT.VALUE_OFFSET_Y,
		),
		() => {
			const newValue = !getValue();
			setValue(newValue);
			SetText(toggleButton.text, newValue ? 'ON' : 'OFF')
		},
		//BOOLEAN_TOGGLE_WIDTH
	);

	AddChildren(container,
		[
			labelText,
			valueText,
			toggleButton.container
		])

	return container;
}


export function BooleanSpec(
	key: string,
	label: string,
	yPos: number,
	getValue: () => boolean,
	setValue: (value: boolean) => void,
): Entity<Container> {

	return {
		key,
		create: () => create(label, yPos, getValue, setValue),
	}
}