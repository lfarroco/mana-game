import * as io from "@PhaserIO";
import { size, vec2 } from "@Models/Geometry";
import { playSoundEffect } from "@Systems/AudioManager";

type EncounterCardProps = {
	x: number;
	y: number;
	width: number;
	height: number;
	name: string;
	pic: string;
	description: string;
	onClick: () => void | Promise<void>;
};

export function createEncounterCard(container: Phaser.GameObjects.Container, props: EncounterCardProps) {
	const { x, y, width, height, name, pic, description, onClick } = props;
	const padding = 70;
	const dimensions = size(width, height);

	const bg = io.Rectangle(
		vec2(x, y),
		dimensions,
		0x1f1f1f,
		1
	);

	const icon = io
		.Image(pic)
		.setDisplaySize(128, 128)
		.setPosition(
			x - dimensions.width / 2 + padding,
			y - dimensions.height / 2 + padding + 70
		);

	io.Tween({
		targets: [icon],
		repeat: -1,
		duration: 200 * Math.random() + 2000,
		ease: "Linear",
		yoyo: true,
		y: {
			from: y - dimensions.height / 2 + padding + 30,
			to: y - dimensions.height / 2 + padding + 30 + 10
		}
	});

	const title = io.Title2(name)
		.setPosition(
			x - dimensions.width / 2 + padding + 100,
			y - dimensions.height / 2 + padding
		);

	const label = io.Label(description)
		.setPosition(
			x - dimensions.width / 2 + padding + 100,
			y - dimensions.height / 2 + padding + 50
		);

	// We can't use io.SetInteractiveRect directly if it expects a type we can't easily reproduce or if we want custom behavior?
	// Encounter.ts uses: io.SetInteractiveRect(dimensions)(bg);
	io.SetInteractiveRect(dimensions)(bg);

	io.OnPointerOver(bg, () => {
		io.Tween({
			targets: [bg],
			alpha: 0.4,
			duration: 400,
			ease: "Linear"
		});
	});

	io.OnPointerOut(bg, () => {
		io.Tween({
			targets: [bg],
			alpha: 1,
			duration: 400,
			ease: "Linear"
		});
	});

	io.OnPointerUp(bg, () => {
		playSoundEffect('sfx_unit_run_magical_4');
		onClick();
	});

	container.add([bg, icon, title, label]);

	return { bg, icon, title, label };
}
