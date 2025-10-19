import { titleTextConfig } from "@Constants/constants";
import { Entity } from "@Models/Entities/Entity";
import { sumVec2, vec2 } from "@Models/Geometry";
import { AddChildren, Centralize, Container, SetPosition, SetText, Text } from "@PhaserIO";
import { createUIButton } from "@UI/UIButton";
import { read, write } from "@Utils";

function create(
	label: string,
	position: Vec2,
	key: string,
) {

	const container = Container()
	SetPosition(container, position);

	const labelText = Text(
		vec2(0, 0),
		label,
		titleTextConfig
	)
	Centralize(labelText)

	const toggleButton = createUIButton(
		read(key) ? 'ON' : 'OFF',
		sumVec2(position, vec2(0, 70)),
		() => {
			const newValue = !read(key);
			write(key, newValue);
			SetText(toggleButton.text, newValue ? 'ON' : 'OFF')
		},
	);
	AddChildren(container, [labelText, toggleButton.container])

	return toggleButton.container;
}


export function BooleanSpec(
	key: string,
	label: string,
	position: Vec2,
): Entity<Container> {

	return {
		key,
		create: () => create(label, position, `${key}/value`),
	}
}