/**
 * @file Slow Effect Implementation
 * Creates a visual effect showing brownish particles moving downwards to indicate slow status.
 */

import { images } from "../assets";
import { delay } from "../Utils/animation";

export interface SlowEffectOptions {
	/** Duration of the effect in milliseconds */
	duration?: number;
	/** Intensity of the effect (0.5 = light, 1.0 = normal, 2.0 = intense) */
	intensity?: number;
	/** Color tint for the particles */
	color?: number;
}

/**
 * Creates a slow visual effect at the specified position
 * Shows brownish particles moving downwards for the duration
 */
export async function slowEffect(
	scene: Phaser.Scene,
	{ x, y }: { x: number; y: number; },
	options: SlowEffectOptions = {}
): Promise<void> {
	const {
		duration = 500,
		intensity = 2.0,
		color = 0xD2691E // Orange-brownish color (chocolate/saddle brown)
	} = options;

	// Create downward-moving heavy particles
	const particles = scene.add.particles(
		x, y,
		images.white_dot.key,
		{
			// Movement configuration - particles fall downward
			speedY: { min: 20 * intensity, max: 60 * intensity },
			speedX: { min: -10 * intensity, max: 10 * intensity }, // Slight horizontal drift
			// Visual properties - thick, heavy particle shape
			tint: color,
			alpha: { start: 0.9, end: 0 },
			// Timing and behavior
			lifespan: duration,
			frequency: 200 / intensity, // More frequent for denser effect
			quantity: Math.max(1, Math.floor(2 * intensity)),

			// Visual effects - thick, round particle shape for heaviness
			scaleX: { start: 1.2 * intensity, end: 0.2 }, // Thicker width
			scaleY: { start: 1.2 * intensity, end: 0.2 }, // Round shape
			blendMode: 'NORMAL',

			// Emit zone - character sprite area coverage
			emitZone: {
				source: new Phaser.Geom.Circle(0, 0, 40),
				type: 'random'
			} as Phaser.Types.GameObjects.Particles.EmitZoneData,

			// Gravity effect to make particles feel heavier
			gravityY: 50 * intensity // Strong downward pull
		}
	);

	// Let the effect run for its duration
	await delay(scene, duration);

	// Stop emitting new particles
	particles.stop();

	// Wait for existing particles to fade out
	await delay(scene, duration);

	// Clean up
	particles.destroy();
}

/**
 * Creates a continuous slow effect that can be stopped externally
 * Returns a cleanup function to stop the effect
 */
export function createContinuousSlowEffect(
	scene: Phaser.Scene,
	{ x, y }: { x: number; y: number; },
	options: SlowEffectOptions = {}
): { particles: Phaser.GameObjects.Particles.ParticleEmitter; cleanup: () => void } {
	const {
		intensity = 1.0,
		color = 0xD2691E // Orange-brownish color (chocolate/saddle brown)
	} = options;

	const particles = scene.add.particles(
		x, y,
		images.white_dot.key,
		{
			// Movement configuration - particles fall downward
			speedY: { min: 40 * intensity, max: 80 * intensity },
			speedX: { min: -8 * intensity, max: 8 * intensity },
			// Visual properties - thick, heavy particle shape for continuous effect
			tint: color,
			scaleX: { start: 1.0 * intensity, end: 0.3 * intensity }, // Thick, round particles
			scaleY: { start: 1.0 * intensity, end: 0.3 * intensity }, // Maintain round shape
			alpha: { start: 0.8, end: 0 },

			// Timing and behavior for continuous effect
			lifespan: 1000,
			frequency: 250 / intensity, // Dense particle emission
			quantity: 2,

			// Visual effects
			blendMode: 'NORMAL',

			// Emit zone - character sprite area coverage
			emitZone: {
				source: new Phaser.Geom.Circle(0, 0, 35),
				type: 'random'
			} as Phaser.Types.GameObjects.Particles.EmitZoneData,

			// Strong gravity for heavy feel
			gravityY: 40 * intensity
		}
	);

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
