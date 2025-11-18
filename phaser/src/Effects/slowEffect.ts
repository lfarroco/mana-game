import { getCurrentScene } from "@Models/State";
import { images } from "../assets";
import { delay } from "@Utils/animation";

export interface SlowEffectOptions {
	duration?: number;
	intensity?: number;
	color?: number;
}

export async function slowEffect(
	{ x, y }: { x: number; y: number },
	options: SlowEffectOptions = {}
): Promise<void> {
	const {
		duration = 500,
		intensity = 2.0,
		color = 0xd2691e, // Orange-brownish color (chocolate/saddle brown)
	} = options;

	const particles = getCurrentScene().add.particles(x, y, images.white_dot.key, {
		speedY: { min: 20 * intensity, max: 60 * intensity },
		speedX: { min: -10 * intensity, max: 10 * intensity },
		tint: color,
		alpha: { start: 0.9, end: 0 },
		lifespan: duration,
		frequency: 200 / intensity,
		quantity: Math.max(1, Math.floor(2 * intensity)),

		scaleX: { start: 1.2 * intensity, end: 0.2 },
		scaleY: { start: 1.2 * intensity, end: 0.2 },
		blendMode: "NORMAL",

		emitZone: {
			source: new Phaser.Geom.Circle(0, 0, 40),
			type: "random",
		} as Phaser.Types.GameObjects.Particles.EmitZoneData,

		gravityY: 50 * intensity,
	});

	await delay(duration);

	particles.stop();

	await delay(duration);

	particles.destroy();
}

export function createContinuousSlowEffect(
	scene: Phaser.Scene,
	{ x, y }: { x: number; y: number },
	options: SlowEffectOptions = {}
): { particles: Phaser.GameObjects.Particles.ParticleEmitter; cleanup: () => void } {
	const {
		intensity = 1.0,
		color = 0xd2691e, // Orange-brownish color (chocolate/saddle brown)
	} = options;

	const particles = scene.add.particles(x, y, images.white_dot.key, {
		speedY: { min: 40 * intensity, max: 80 * intensity },
		speedX: { min: -8 * intensity, max: 8 * intensity },
		tint: color,
		scaleX: { start: 1.0 * intensity, end: 0.3 * intensity },
		scaleY: { start: 1.0 * intensity, end: 0.3 * intensity },
		alpha: { start: 0.8, end: 0 },

		lifespan: 1000,
		frequency: 250 / intensity,
		quantity: 2,

		blendMode: "NORMAL",

		emitZone: {
			source: new Phaser.Geom.Circle(0, 0, 35),
			type: "random",
		} as Phaser.Types.GameObjects.Particles.EmitZoneData,

		gravityY: 40 * intensity,
	});

	const cleanup = () => {
		particles.stop();
		scene.time.delayedCall(1000, () => {
			if (particles && particles.active) {
				particles.destroy();
			}
		});
	};

	return { particles, cleanup };
}
