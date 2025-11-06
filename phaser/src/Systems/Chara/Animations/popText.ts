import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { tween } from "@Utils/animation";
import { defaultTextConfig, titleTextConfig } from "@Constants/constants";

const CONFIG = {
	MAX_ANGLE: 30,
	SCALE_TARGET: 1.4,
	MOVE_DURATION: 1000,
	FADE_DELAY: 500,
	FADE_DURATION: 1000,
	VERTICAL_DISTANCE: 128,
	HORIZONTAL_SPREAD: 60,
	COLORS: {
		HEAL: "green",
		REGEN: "darkgreen",
		DAMAGE: "red",
		SHIELD: "yellow",
		POISON: "#9932cc",
		TIMEOUT: "#ff8c00",
	}
};

export async function popText({
	x,
	y,
	text,
	type,
	direction = "up",
	critical = false
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
		textColor = CONFIG.COLORS.HEAL;
	} else if (type === "damage") {
		textColor = CONFIG.COLORS.DAMAGE;
	} else if (type === "shield") {
		textColor = CONFIG.COLORS.SHIELD;
	} else if (type === "poison") {
		textColor = CONFIG.COLORS.POISON;
	} else if (type === "timeout") {
		textColor = CONFIG.COLORS.TIMEOUT;
	} else if (type === "regen") {
		textColor = CONFIG.COLORS.REGEN;
	}

	const popText = scene.add.text(
		x, y,
		text,
		{
			...titleTextConfig,
			...(critical ? { fontSize: 50 } : {})
		}
	)
		.setOrigin(0.5, 0.5);
	if (textColor) popText.setColor(textColor);

	// random angle upwards or downwards based on direction
	const angle = Math.random() * CONFIG.MAX_ANGLE * (Math.random() < 0.5 ? -1 : 1);

	// Calculate vertical movement based on direction
	const verticalMovement = direction === "down"
		? CONFIG.VERTICAL_DISTANCE  // Move down (positive Y)
		: direction === "up"
			? -CONFIG.VERTICAL_DISTANCE // Move up (negative Y)
			: 0;

	const horizontalMovement = direction === "left"
		? -CONFIG.HORIZONTAL_SPREAD // Move left (negative X)
		: direction === "right"
			? CONFIG.HORIZONTAL_SPREAD // Move right (positive X)
			: 0;

	tween({
		targets: [popText],
		scale: CONFIG.SCALE_TARGET,
		duration: CONFIG.MOVE_DURATION,
		y: y + verticalMovement,
		// in the angle direction
		x: x + Math.sin(angle * Math.PI / 180) * CONFIG.HORIZONTAL_SPREAD + horizontalMovement,
	});
	await tween({
		targets: [popText],
		delay: CONFIG.FADE_DELAY,
		alpha: 0,
		duration: CONFIG.FADE_DURATION
	});

	popText.destroy();
}
