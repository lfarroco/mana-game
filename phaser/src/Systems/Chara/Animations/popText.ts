import { tween } from "@Utils/animation";
import { defaultTextConfig, titleTextConfig } from "@Constants/constants";
import { getCurrentScene } from "@Models/State";

// Pop text animation configuration
const POP_TEXT_MAX_ROTATION_ANGLE = 30;
const POP_TEXT_SCALE_TARGET = 1.4;
const POP_TEXT_MOVE_DURATION_MS = 1000;
const POP_TEXT_FADE_DELAY_MS = 500;
const POP_TEXT_FADE_DURATION_MS = 1000;
const POP_TEXT_VERTICAL_DISTANCE = 128;
const POP_TEXT_HORIZONTAL_SPREAD = 60;
const POP_TEXT_CRITICAL_FONT_SIZE = 50;

const POP_TEXT_COLORS = {
	HEAL: "green",
	REGEN: "darkgreen",
	DAMAGE: "red",
	SHIELD: "yellow",
	POISON: "#9932cc",
	TIMEOUT: "#ff8c00",
} as const;

export function popText({
	x,
	y,
	text,
	type,
	direction = "up",
	critical = false,
}: {
	x: number;
	y: number;
	text: string;
	type?: "heal" | "damage" | "shield" | "poison" | "timeout" | "regen";
	direction?: "up" | "down" | "left" | "right";
	critical?: boolean;
}) {
	let textColor = defaultTextConfig.color;
	if (type === "heal") {
		textColor = POP_TEXT_COLORS.HEAL;
	} else if (type === "damage") {
		textColor = POP_TEXT_COLORS.DAMAGE;
	} else if (type === "shield") {
		textColor = POP_TEXT_COLORS.SHIELD;
	} else if (type === "poison") {
		textColor = POP_TEXT_COLORS.POISON;
	} else if (type === "timeout") {
		textColor = POP_TEXT_COLORS.TIMEOUT;
	} else if (type === "regen") {
		textColor = POP_TEXT_COLORS.REGEN;
	}

	const popText = getCurrentScene()
		.add.text(x, y, text, {
			...titleTextConfig,
			...(critical ? { fontSize: POP_TEXT_CRITICAL_FONT_SIZE } : {}),
		})
		.setOrigin(0.5, 0.5);
	if (textColor) popText.setColor(textColor);

	// random angle upwards or downwards based on direction
	const angle = Math.random() * POP_TEXT_MAX_ROTATION_ANGLE * (Math.random() < 0.5 ? -1 : 1);

	// Calculate vertical movement based on direction
	const verticalMovement =
		direction === "down"
			? POP_TEXT_VERTICAL_DISTANCE // Move down (positive Y)
			: direction === "up"
				? -POP_TEXT_VERTICAL_DISTANCE // Move up (negative Y)
				: 0;

	const horizontalMovement =
		direction === "left"
			? -POP_TEXT_HORIZONTAL_SPREAD // Move left (negative X)
			: direction === "right"
				? POP_TEXT_HORIZONTAL_SPREAD // Move right (positive X)
				: 0;

	tween({
		targets: [popText],
		scale: POP_TEXT_SCALE_TARGET,
		duration: POP_TEXT_MOVE_DURATION_MS,
		y: y + verticalMovement,
		// in the angle direction
		x: x + Math.sin((angle * Math.PI) / 180) * POP_TEXT_HORIZONTAL_SPREAD + horizontalMovement,
	});
	tween({
		targets: [popText],
		delay: POP_TEXT_FADE_DELAY_MS,
		alpha: 0,
		duration: POP_TEXT_FADE_DURATION_MS,
		onComplete: () => {
			popText.destroy();
		},
	});

	return popText;
}
