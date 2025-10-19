import { titleTextConfig } from "@Constants/constants";
import { Entity } from "@Models/Entities/Entity";
import { vec2 } from "@Models/Geometry";
import { AddChildren, Centralize, Container, SetPosition, Text } from "@PhaserIO";
import { createUIButton } from "@UI/UIButton";
import { read, write } from "@Utils";

function create(
	key: string,
	label: string,
	position: Vec2,
) {

	const container = Container();

	const formattedLabel = () => Math.round((read(key, 10, true)) * 10) + '%'

	const updateText = () => {
		valueText.setText(formattedLabel());
	}

	SetPosition(container, position);

	const labelText = Text(
		vec2(0, 0),
		label,
		titleTextConfig
	)

	Centralize(labelText)

	const decreaseButton = createUIButton(
		'-',
		vec2(-150, 70),
		() => {
			const newValue = Math.max(1, (read(key, 10)) - 1);
			write(key, newValue, true);
			updateText();
		},
		50
	);

	const valueText = Text(
		vec2(0, 70),
		formattedLabel(),
		titleTextConfig,
	)
	Centralize(valueText)

	const increaseButton = createUIButton(
		'+',
		vec2(150, 70),
		() => {
			const newValue = Math.min(10, read(key, 10) + 1);
			write(key, newValue, true);
			updateText();
		},
		50
	);

	AddChildren(container, [
		labelText,
		decreaseButton.container,
		valueText,
		increaseButton.container
	])

	return container
}

export function VolumeSpec(
	key: string,
	label: string,
	position: Vec2,
): Entity<Container> {

	return {
		key,
		create: () => create(`${key}/value`, label, position),
	}
}