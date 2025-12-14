import * as io from "@PhaserIO";
import { size, vec2 } from "@Models/Geometry";
import { playSoundEffect } from "@Systems/AudioManager";
import { getCurrentScene } from "@Models/State";
import { titleTextConfig } from "@Constants/constants";

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
	const padding = 20;
	const dimensions = size(width, height);
	const scene = getCurrentScene();

	const bg = io.Rectangle(
		vec2(x, y),
		dimensions,
		0x1f1f1f,
		1
	);

	const iconSize = 120;
	const iconX = x - width / 2 + padding + iconSize / 2 + 10;
	const iconY = y;

	// Icon
	const icon = io
		.Image(pic)
		.setDisplaySize(iconSize, iconSize)
		.setPosition(iconX, iconY + 10);

	// Initial floating animation
	io.Tween({
		targets: [icon],
		repeat: -1,
		duration: 200 * Math.random() + 2000,
		ease: "Linear",
		yoyo: true,
		y: {
			from: iconY,
			to: iconY + 10
		}
	});

	const textX = x - width / 2 + padding + iconSize + 40;
	const textWidth = width - (padding + iconSize + 40 + padding);

	const title = scene.add.text(
		textX,
		y - height / 2 + 30,
		name,
		{
			...titleTextConfig,
			fontSize: "26px",
			align: "left",
			wordWrap: { width: textWidth }
		}
	).setOrigin(0, 0);

	const label = scene.add
		.rexBBCodeText(
			textX,
			y - height / 2 + 75,
			description,
			{
				fontSize: "22px",
				fontFamily: "Arimo",
				color: "#dddddd",
				wrap: {
					mode: 1, // Word wrap
					width: textWidth
				}
			}
		)
		.setOrigin(0, 0);

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
