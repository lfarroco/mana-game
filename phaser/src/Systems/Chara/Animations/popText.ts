import { tween } from "../../../Utils/animation";
import { defaultTextConfig, titleTextConfig } from "../../../constants/constants";

// TODO: add color option (heals: green, damage: yellow, etc)
// TODO: move this to the chara system, as it always uses the chara container
// TODO: for skills, use elastic pop. for damage, move the numbers
export async function popText({
	scene,
	x,
	y,
	text,
	type // "heal", "damage", or undefined for default
}: {
	scene: Phaser.Scene;
	x: number;
	y: number;
	text: string;
	type?: "heal" | "damage";
}) {
	let textColor = defaultTextConfig.color;
	if (type === "heal") {
		textColor = "green";
	} else if (type === "damage") {
		textColor = "red";
	}

	const popText = scene.add.text(
		x, y,
		text,
		{
			...titleTextConfig,
		}
	)
		.setOrigin(0.5, 0.5);
	if (textColor) popText.setColor(textColor);

	// random angle upwards
	const angle = Math.random() * 30 * (Math.random() < 0.5 ? -1 : 1);

	tween({
		targets: [popText],
		scale: 1.4,
		duration: 1000,
		y: y - 128,
		// in the angle direction
		x: x + Math.sin(angle * Math.PI / 180) * 60,
	});
	await tween({
		targets: [popText],
		delay: 500,
		alpha: 0,
		duration: 1000
	});

	popText.destroy();
}
