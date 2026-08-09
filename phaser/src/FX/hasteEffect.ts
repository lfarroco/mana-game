import * as AudioManager from "@Systems/AudioManager";
import { delay } from "@Utils/animation";
import { env } from "@Env";

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
		console.warn("hasteEffect", "Could not play haste effect sound:", error);
	}

	const scene = env.scene;
	const rects: Phaser.GameObjects.Rectangle[] = [];

	const count = Math.max(4, Math.floor(6 * intensity));
	for (let i = 0; i < count; i++) {
		const startX = x + Phaser.Math.FloatBetween(-40, 40);
		const startY = y + Phaser.Math.FloatBetween(-20, 20);
		const size = Phaser.Math.FloatBetween(8, 16) * intensity;
		const rise = Phaser.Math.FloatBetween(20, 60) * intensity;
		const drift = Phaser.Math.FloatBetween(-10, 10) * intensity;

		const rect = scene.add.rectangle(startX, startY, size, size, color, 0.8);
		rect.setBlendMode(Phaser.BlendModes.ADD);
		rects.push(rect);

		scene.tweens.add({
			targets: rect,
			x: startX + drift,
			y: startY - rise,
			alpha: 0,
			scaleX: 0,
			scaleY: 0,
			duration,
			ease: "Cubic.easeOut",
			onComplete: () => {
				rect.destroy();
			},
		});
	}

	await delay(duration);

	rects.forEach((rect) => {
		if (rect.active) {
			rect.destroy();
		}
	});
}

export function createContinuousHasteEffect(
	scene: Phaser.Scene,
	{ x, y }: { x: number; y: number },
	options: HasteEffectOptions = {}
): { particles: Phaser.GameObjects.Particles.ParticleEmitter; cleanup: () => void } {
	const { intensity = 1.0, color = 0x00eaff } = options;

	const particles = scene.add.particles(x, y, "__WHITE", {
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
