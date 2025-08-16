import { images } from "../assets";
import { delay } from "../Utils/animation";
import { IMPACT_EFFECT_CONFIG } from "../constants/constants";

type ImpactEffctProps = {
	scene: Phaser.Scene;
	location: { x: number; y: number; };
	pointA: { x: number; y: number; };
	pointB: { x: number; y: number; };
};

export async function impactEffect({
	scene,
	location,
	pointA,
	pointB
}: ImpactEffctProps) {

	const angle = Phaser.Math.Angle.BetweenPoints(pointA, pointB);

	const particles = scene.add.particles(
		location.x, location.y,
		images.white_dot.key,
		{
			speed: IMPACT_EFFECT_CONFIG.PARTICLE_SPEED,
			lifespan: IMPACT_EFFECT_CONFIG.PARTICLE_LIFESPAN,
			angle: {
				min: Phaser.Math.RadToDeg(angle) - IMPACT_EFFECT_CONFIG.ANGLE_SPREAD,
				max: Phaser.Math.RadToDeg(angle) + IMPACT_EFFECT_CONFIG.ANGLE_SPREAD
			},
			gravityY: 0,
			alpha: { start: 1, end: 0, ease: 'sine.out' },
			maxAliveParticles: IMPACT_EFFECT_CONFIG.MAX_ALIVE_PARTICLES,
			scale: { min: IMPACT_EFFECT_CONFIG.SCALE_MIN, max: IMPACT_EFFECT_CONFIG.SCALE_MAX },
			stopAfter: IMPACT_EFFECT_CONFIG.STOP_AFTER
		});

	await delay(IMPACT_EFFECT_CONFIG.PARTICLE_LIFESPAN);

	particles.destroy();
}
