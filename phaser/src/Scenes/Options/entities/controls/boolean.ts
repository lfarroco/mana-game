import { titleTextConfig } from "@Constants/constants";
import { Entity } from "@Models/Entities/Entity";
import { sumVec2, vec2 } from "@Models/Geometry";
import { AddChildren, Centralize, Container, SetPosition, SetText, Text } from "@PhaserIO";
import { createUIButton } from "@UI/UIButton";
import { emit, read, write } from "@Utils";

type BooleanControlProps = {
	key: string;
	event: string;
	label: string;
	position: Vec2;
	persist: boolean;
	labels: {
		true: string;
		false: string;
	};
}

function create(
	{
		label,
		event,
		position,
		key,
		persist,
		labels
	}: BooleanControlProps
) {

	const getLabel = () => read(key, true, persist) ? labels.true : labels.false;

	const container = Container()
	SetPosition(container, position);

	const labelText = Text(
		vec2(0, 0),
		label,
		titleTextConfig
	)
	Centralize(labelText)

	const toggleButton = createUIButton(
		getLabel(),
		sumVec2(position, vec2(0, 70)),
		() => {
			const newValue = !read(key, true, persist);
			write(key, newValue, persist);
			SetText(toggleButton.text, getLabel())
			emit(event, newValue)
		},
	);
	AddChildren(container, [labelText, toggleButton.container])

	return toggleButton.container;
}

export function BooleanSpec({
	key,
	event,
	label,
	position,
	persist = false,
	labels = { true: 'ON', false: 'OFF' }
}: {
	key: string;
	event: string;
	label: string;
	position: Vec2;
	persist?: boolean;
	labels?: {
		true: string;
		false: string;
	}
}): Entity<Container> {

	return {
		key,
		create: () => create({ label, event, position, key: `${key}/value`, persist, labels }),
	}
}