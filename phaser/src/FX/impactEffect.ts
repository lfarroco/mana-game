import * as animation from "@Utils/animation";
import { env } from "@Env";

export const IMPACT_EFFECT_CONFIG = {
	PARTICLE_SPEED: 200,
	PARTICLE_LIFESPAN: 600,
	ANGLE_SPREAD: 40,
	PARTICLE_COUNT: 8,
	PARTICLE_SIZE_MIN: 20,
	PARTICLE_SIZE_MAX: 40,
	ALPHA: 0.8,
	COLORS: [0xffffff, 0xffffaa, 0xffddaa],
} as const;

type ImpactEffctProps = {
	location: Vec2;
	pointA: Vec2;
	pointB: Vec2;
	colors?: number[];
};

export async function impactEffect({ location, pointA, pointB, colors }: ImpactEffctProps) {
	const scene = env.scene;
	const [x, y] = location;

	const angle = Phaser.Math.Angle.BetweenPoints(
		{
			x: pointA[0],
			y: pointA[1],
		},
		{
			x: pointB[0],
			y: pointB[1],
		}
	);

	const {
		PARTICLE_SPEED,
		PARTICLE_LIFESPAN,
		ANGLE_SPREAD,
		PARTICLE_COUNT,
		PARTICLE_SIZE_MIN,
		PARTICLE_SIZE_MAX,
		ALPHA,
		COLORS,
	} = IMPACT_EFFECT_CONFIG;

	const impactColors = colors ?? COLORS;
	const rects: Phaser.GameObjects.Rectangle[] = [];

	for (let i = 0; i < PARTICLE_COUNT; i++) {
		const particleAngle = Phaser.Math.DegToRad(
			Phaser.Math.RadToDeg(angle) + Phaser.Math.FloatBetween(-ANGLE_SPREAD, ANGLE_SPREAD)
		);
		const speed = PARTICLE_SPEED * Phaser.Math.FloatBetween(0.6, 1.2);
		const travelDistance = (speed * PARTICLE_LIFESPAN) / 1000;
		const color = impactColors[Math.floor(Math.random() * impactColors.length)];
		const size = Phaser.Math.FloatBetween(PARTICLE_SIZE_MIN, PARTICLE_SIZE_MAX);

		const rect = scene.add.rectangle(x, y, size, size, color, ALPHA);
		rect.setBlendMode(Phaser.BlendModes.ADD);
		rects.push(rect);

		scene.tweens.add({
			targets: rect,
			x: x + Math.cos(particleAngle) * travelDistance,
			y: y + Math.sin(particleAngle) * travelDistance,
			alpha: 0,
			scaleX: 0,
			scaleY: 0,
			duration: PARTICLE_LIFESPAN,
			ease: "Cubic.easeOut",
			onComplete: () => {
				rect.destroy();
			},
		});
	}

	await animation.delay(PARTICLE_LIFESPAN);

	rects.forEach((rect) => {
		if (rect.active) {
			rect.destroy();
		}
	});
}
