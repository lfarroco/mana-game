import * as animation from "@Utils/animation";
import * as impactEffect from "./impactEffect";
import { env } from "@Env";

const EXPLODE_EFFECT_CONFIG = {
	LIFESPAN: 1000,
	SPARK_COUNT: 15,
	SPARK_SIZE_MIN: 8,
	SPARK_SIZE_MAX: 20,
	SPARK_SPEED_MIN: 150,
	SPARK_SPEED_MAX: 350,
	COLORS: [0xff0000, 0xffff00, 0xffa500],
} as const;

export async function explodeEffect([x, y]: Vec2) {
	const {
		LIFESPAN,
		SPARK_COUNT,
		SPARK_SIZE_MIN,
		SPARK_SIZE_MAX,
		SPARK_SPEED_MIN,
		SPARK_SPEED_MAX,
		COLORS,
	} = EXPLODE_EFFECT_CONFIG;

	const scene = env.scene;
	const rects: Phaser.GameObjects.Rectangle[] = [];

	// Sparks bursting outward from the center
	for (let i = 0; i < SPARK_COUNT; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = Phaser.Math.FloatBetween(SPARK_SPEED_MIN, SPARK_SPEED_MAX);
		const travelDistance = (speed * LIFESPAN) / 1000;
		const color = COLORS[Math.floor(Math.random() * COLORS.length)];
		const size = Phaser.Math.FloatBetween(SPARK_SIZE_MIN, SPARK_SIZE_MAX);

		const rect = scene.add.rectangle(x, y, size, size, color, 0.5);
		rect.setBlendMode(Phaser.BlendModes.ADD);
		rects.push(rect);

		scene.tweens.add({
			targets: rect,
			x: x + Math.cos(angle) * travelDistance,
			y: y + Math.sin(angle) * travelDistance,
			alpha: 0,
			scaleX: 0,
			scaleY: 0,
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

	await impactEffect.impactEffect({
		location: [x, y],
		pointA: [x, y],
		pointB: [x, y],
		colors: [...COLORS],
	});

}
