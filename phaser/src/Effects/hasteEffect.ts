import { getCurrentScene } from "@Models/State";
import { images } from "../assets";
import * as AudioManager from "@Systems/AudioManager";
import { delay } from "@Utils/animation";

export interface HasteEffectOptions {
	duration?: number;
	intensity?: number;
	color?: number;
}

export async function hasteEffect(
	{ x, y }: { x: number; y: number },
	options: HasteEffectOptions = {}
): Promise<void> {
	const { duration = 500, intensity = 2.0, color = 0x00eaff } = options;

	try {
		AudioManager.playSoundEffect("sfx_artifact_equipmask");
	} catch (error) {
		console.warn("Could not play haste effect sound:", error);
	}

	const particles = getCurrentScene().add.particles(x, y, images.light_pillar.key, {
		speedY: { min: -20 * intensity, max: -60 * intensity },
		speedX: { min: -10 * intensity, max: 10 * intensity },
		tint: color,
		alpha: { start: 0.8, end: 0 },
		lifespan: duration,
		frequency: 150 / intensity,
		quantity: Math.max(1, Math.floor(1 * intensity)),

		scaleX: { start: 0.8 * intensity, end: 0.0 },
		scaleY: { start: 1.5 * intensity, end: 1.7 * intensity },
		blendMode: "ADD",

		emitZone: {
			source: new Phaser.Geom.Circle(0, 0, 40),
			type: "random",
		} as Phaser.Types.GameObjects.Particles.EmitZoneData,

		gravityY: 20 * intensity,
	});

	await delay(duration);

	particles.stop();

	await delay(duration);

	particles.destroy();
}

export function createContinuousHasteEffect(
	scene: Phaser.Scene,
	{ x, y }: { x: number; y: number },
	options: HasteEffectOptions = {}
): { particles: Phaser.GameObjects.Particles.ParticleEmitter; cleanup: () => void } {
	const { intensity = 1.0, color = 0x00eaff } = options;

	const particles = scene.add.particles(x, y, images.white_dot.key, {
		speedY: { min: -60 * intensity, max: -100 * intensity },
		speedX: { min: -8 * intensity, max: 8 * intensity },
		tint: color,
		scaleX: { start: 0.6 * intensity, end: 0.08 * intensity },
		scaleY: { start: 3.0 * intensity, end: 0.6 * intensity },
		alpha: { start: 0.7, end: 0 },

		lifespan: 800,
		frequency: 300 / intensity,
		quantity: 1,

		blendMode: "ADD",

		emitZone: {
			source: new Phaser.Geom.Circle(0, 0, 35),
			type: "random",
		} as Phaser.Types.GameObjects.Particles.EmitZoneData,

		gravityY: 15 * intensity,
	});

	const cleanup = () => {
		particles.stop();
		scene.time.delayedCall(800, () => {
			if (particles && particles.active) {
				particles.destroy();
			}
		});
	};

	return { particles, cleanup };
}
