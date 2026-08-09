import * as animation from "@Utils/animation";
import { getSettings } from "@Models/OptionsStore";
import { env } from "@Env";

const SUMMON_EFFECT_CONFIG = {
	LIFESPAN: 200,
	SCALE_START: 5,
	SCALE_END: 17.2,
	SPEED_MIN: 100,
	SPEED_MAX: 200,
	EMIT_ZONE_RADIUS: 40,
	EMIT_ZONE_QUANTITY: 8,
	COLORS: [0xffffff, 0xffffaa, 0xccddff],
} as const;


export async function summonEffect({ x, y }: { x: number; y: number }) {
	const {
		LIFESPAN,
		SCALE_START,
		SCALE_END,
		SPEED_MIN,
		SPEED_MAX,
		EMIT_ZONE_RADIUS,
		EMIT_ZONE_QUANTITY,
		COLORS,
	} = SUMMON_EFFECT_CONFIG;


	const particlesOption = getSettings().particles;
	let multiplier = 1;
	if (particlesOption === "low") multiplier = 0.5;
	else if (particlesOption === "high") multiplier = 2;

	const scene = env.scene;
	const rects: Phaser.GameObjects.Rectangle[] = [];

	const count = Math.floor(EMIT_ZONE_QUANTITY * multiplier);
	for (let i = 0; i < count; i++) {
		const angle = Math.random() * Math.PI * 2;
		const radius = Math.random() * EMIT_ZONE_RADIUS;
		const startX = x + Math.cos(angle) * radius;
		const startY = y + Math.sin(angle) * radius;
		const speed = Phaser.Math.FloatBetween(SPEED_MIN, SPEED_MAX);
		const travelDistance = (speed * LIFESPAN) / 1000;
		const color = COLORS[Math.floor(Math.random() * COLORS.length)];
		const size = Phaser.Math.FloatBetween(8, 16);

		const rect = scene.add.rectangle(startX, startY, size, size, color, 1);
		rect.setBlendMode(Phaser.BlendModes.ADD);
		rect.setScale(SCALE_START);
		rects.push(rect);

		scene.tweens.add({
			targets: rect,
			x: startX + Math.cos(angle) * travelDistance,
			y: startY + Math.sin(angle) * travelDistance,
			scaleX: SCALE_END,
			scaleY: SCALE_END,
			alpha: 0,
			duration: LIFESPAN,
			ease: "Cubic.easeOut",
			onComplete: () => {
				rect.destroy();
			},
		});
	}

	await animation.delay(LIFESPAN);

	rects.forEach((rect) => {
		if (rect.active) {
			rect.destroy();
		}
	});
}
