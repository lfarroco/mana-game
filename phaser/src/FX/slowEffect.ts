import { delay } from "@Utils/animation";
import { env } from "@Env";

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

	const scene = env.scene;
	const rects: Phaser.GameObjects.Rectangle[] = [];

	const count = Math.max(4, Math.floor(6 * intensity));
	for (let i = 0; i < count; i++) {
		const startX = x + Phaser.Math.FloatBetween(-40, 40);
		const startY = y + Phaser.Math.FloatBetween(-20, 20);
		const size = Phaser.Math.FloatBetween(8, 16) * intensity;
		const fall = Phaser.Math.FloatBetween(20, 60) * intensity;
		const drift = Phaser.Math.FloatBetween(-10, 10) * intensity;

		const rect = scene.add.rectangle(startX, startY, size, size, color, 0.9);
		rects.push(rect);

		scene.tweens.add({
			targets: rect,
			x: startX + drift,
			y: startY + fall,
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

export function createContinuousSlowEffect(
	scene: Phaser.Scene,
	{ x, y }: { x: number; y: number },
	options: SlowEffectOptions = {}
): { particles: Phaser.GameObjects.Particles.ParticleEmitter; cleanup: () => void } {
	const {
		intensity = 1.0,
		color = 0xd2691e, // Orange-brownish color (chocolate/saddle brown)
	} = options;

	const particles = scene.add.particles(x, y, "__WHITE", {
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
