import { tween } from "../../../Utils/animation";
import { defaultTextConfig, titleTextConfig, POP_TEXT_CONFIG } from "../../../constants/constants";

// TODO: move this to the chara system, as it always uses the chara container
// TODO: for skills, use elastic pop. for damage, move the numbers
export async function popText({
	scene,
	x,
	y,
	text,
	type, // "heal", "damage", or undefined for default
	direction = "up" // Direction for animation: "up" or "down"
}: {
	scene: Phaser.Scene;
	x: number;
	y: number;
	text: string;
	type?: "heal" | "damage";
	direction?: "up" | "down";
}) {
	let textColor = defaultTextConfig.color;
	if (type === "heal") {
		textColor = POP_TEXT_CONFIG.COLORS.HEAL;
	} else if (type === "damage") {
		textColor = POP_TEXT_CONFIG.COLORS.DAMAGE;
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

	// random angle upwards or downwards based on direction
	const angle = Math.random() * POP_TEXT_CONFIG.MAX_ANGLE * (Math.random() < 0.5 ? -1 : 1);

	// Calculate vertical movement based on direction
	const verticalMovement = direction === "down"
		? POP_TEXT_CONFIG.VERTICAL_DISTANCE  // Move down (positive Y)
		: -POP_TEXT_CONFIG.VERTICAL_DISTANCE; // Move up (negative Y)

	tween({
		targets: [popText],
		scale: POP_TEXT_CONFIG.SCALE_TARGET,
		duration: POP_TEXT_CONFIG.MOVE_DURATION,
		y: y + verticalMovement,
		// in the angle direction
		x: x + Math.sin(angle * Math.PI / 180) * POP_TEXT_CONFIG.HORIZONTAL_SPREAD,
	});
	await tween({
		targets: [popText],
		delay: POP_TEXT_CONFIG.FADE_DELAY,
		alpha: 0,
		duration: POP_TEXT_CONFIG.FADE_DURATION
	});

	popText.destroy();
}
