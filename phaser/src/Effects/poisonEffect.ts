/**
 * @file Poison Effect Implementation
 * Creates visual effects for poison damage over time.
 */

import { images } from "../assets";
import { delay } from "../Utils/animation";

export interface PoisonEffectOptions {
	/**
	 * Duration of the effect in milliseconds
	 * @default 1000
	 */
	duration?: number;
	/**
	 * Intensity multiplier for particle effects
	 * @default 1.0
	 */
	intensity?: number;
	/**
	 * Color tint for poison particles
	 * @default 0x9932cc (purple)
	 */
	color?: number;
}

/**
 * Creates a poison visual effect at the specified position
 * Shows purple bubbling particles moving upwards and downwards
 */
export async function poisonEffect(
	scene: Phaser.Scene,
	{ x, y }: { x: number; y: number; },
	options: PoisonEffectOptions = {}
): Promise<void> {
	const {
		duration = 1000,
		intensity = 1.0,
		color = 0x9932cc // Purple color for poison
	} = options;

	// Create bubbling poison particles
	const particles = scene.add.particles(
		x, y,
		images.white_dot.key,
		{
			// Movement configuration - bubbles float up and down randomly
			speedY: { min: -30 * intensity, max: 30 * intensity },
			speedX: { min: -15 * intensity, max: 15 * intensity },

			// Visual properties - bubbling effect
			tint: color,
			alpha: { start: 0.8, end: 0 },

			// Timing and behavior
			lifespan: duration,
			frequency: 100 / intensity, // More frequent for denser effect
			quantity: Math.max(2, Math.floor(3 * intensity)),

			// Visual effects - round bubble shape
			scaleX: { start: 0.8 * intensity, end: 0.2 * intensity },
			scaleY: { start: 0.8 * intensity, end: 0.2 * intensity },
			blendMode: 'ADD',

			// Emit zone - spread around the target area
			emitZone: {
				source: new Phaser.Geom.Circle(0, 0, 30),
				type: 'random'
			} as Phaser.Types.GameObjects.Particles.EmitZoneData,

			// Gravity effect to make bubbles feel natural
			gravityY: -20 * intensity // Slight upward float
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
 * Creates a continuous poison effect that can be stopped externally
 * Returns a cleanup function to stop the effect
 */
export function createContinuousPoisonEffect(
	scene: Phaser.Scene,
	{ x, y }: { x: number; y: number; },
	options: PoisonEffectOptions = {}
): { particles: Phaser.GameObjects.Particles.ParticleEmitter; cleanup: () => void } {
	const {
		intensity = 1.0,
		color = 0x9932cc
	} = options;

	const particles = scene.add.particles(
		x, y,
		images.white_dot.key,
		{
			// Movement configuration - continuous bubbling
			speedY: { min: -40 * intensity, max: 40 * intensity },
			speedX: { min: -12 * intensity, max: 12 * intensity },

			// Visual properties - continuous poison bubbles
			tint: color,
			scaleX: { start: 0.6 * intensity, end: 0.1 * intensity },
			scaleY: { start: 0.6 * intensity, end: 0.1 * intensity },
			alpha: { start: 0.7, end: 0 },

			// Timing and behavior for continuous effect
			lifespan: 1200,
			frequency: 200 / intensity,
			quantity: 2,

			// Visual effects
			blendMode: 'ADD',

			// Emit zone - character sprite area coverage
			emitZone: {
				source: new Phaser.Geom.Circle(0, 0, 35),
				type: 'random'
			} as Phaser.Types.GameObjects.Particles.EmitZoneData,

			// Gravity
			gravityY: -15 * intensity
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
