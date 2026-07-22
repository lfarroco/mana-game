import * as Assets from "@assets";
import * as animation from "@Utils/animation";
import { env } from "../Env";

export const IMPACT_EFFECT_CONFIG = {
	PARTICLE_SPEED: 200,
	PARTICLE_LIFESPAN: 600,
	ANGLE_SPREAD: 40,
	MAX_ALIVE_PARTICLES: 5,
	SCALE_MIN: 1,
	SCALE_MAX: 6,
	STOP_AFTER: 5,
} as const;

type ImpactEffctProps = {
	location: Vec2;
	pointA: Vec2;
	pointB: Vec2;
};

export async function impactEffect({ location, pointA, pointB }: ImpactEffctProps) {
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

	const particles = env.scene.add.particles(location[0], location[1], Assets.images.white_dot.key, {
		speed: IMPACT_EFFECT_CONFIG.PARTICLE_SPEED,
		lifespan: IMPACT_EFFECT_CONFIG.PARTICLE_LIFESPAN,
		angle: {
			min: Phaser.Math.RadToDeg(angle) - IMPACT_EFFECT_CONFIG.ANGLE_SPREAD,
			max: Phaser.Math.RadToDeg(angle) + IMPACT_EFFECT_CONFIG.ANGLE_SPREAD,
		},
		gravityY: 0,
		alpha: { start: 1, end: 0, ease: "sine.out" },
		maxAliveParticles: IMPACT_EFFECT_CONFIG.MAX_ALIVE_PARTICLES,
		scale: { min: IMPACT_EFFECT_CONFIG.SCALE_MIN, max: IMPACT_EFFECT_CONFIG.SCALE_MAX },
		stopAfter: IMPACT_EFFECT_CONFIG.STOP_AFTER,
	});

	await animation.delay(IMPACT_EFFECT_CONFIG.PARTICLE_LIFESPAN);

	particles.destroy();
}
