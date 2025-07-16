/**
 * @file Haste Effect Implementation
 * Creates a visual effect showing light-blue droplets moving upwards to indicate haste status.
 */

import { images } from "../assets";
import { delay } from "../Utils/animation";

export interface HasteEffectOptions {
	/** Duration of the effect in milliseconds */
	duration?: number;
	/** Intensity of the effect (0.5 = light, 1.0 = normal, 2.0 = intense) */
	intensity?: number;
	/** Color tint for the droplets */
	color?: number;
}

/**
 * Creates a haste visual effect at the specified position
 * Shows light-blue droplets moving upwards for the duration
 */
export async function hasteEffect(
	scene: Phaser.Scene,
	{ x, y }: { x: number; y: number; },
	options: HasteEffectOptions = {}
): Promise<void> {
	const {
		duration = 1000,
		intensity = 1.0,
		color = 0x00eaff
	} = options;

	// Create upward-moving droplet particles
	const particles = scene.add.particles(
		x, y,
		images.white_dot.key,
		{
			// Movement configuration - droplets rise upward
			speedY: { min: -80 * intensity, max: -120 * intensity },
			speedX: { min: -10 * intensity, max: 10 * intensity }, // Slight horizontal drift

			// Visual properties
			tint: color,
			scale: { start: 2.5 * intensity, end: 0.5 * intensity },
			alpha: { start: 0.8, end: 0 },

			// Timing and behavior
			lifespan: duration,
			frequency: 80 / intensity, // More frequent with higher intensity
			quantity: Math.max(1, Math.floor(2 * intensity)),

			// Visual effects
			blendMode: 'ADD',

			// Emit zone - small area around the unit
			emitZone: {
				source: new Phaser.Geom.Circle(0, 0, 15),
				type: 'random'
			} as Phaser.Types.GameObjects.Particles.EmitZoneData,

			// Gravity effect to make droplets feel more natural
			gravityY: 20 * intensity // Slight upward resistance
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
 * Creates a continuous haste effect that can be stopped externally
 * Returns a cleanup function to stop the effect
 */
export function createContinuousHasteEffect(
	scene: Phaser.Scene,
	{ x, y }: { x: number; y: number; },
	options: HasteEffectOptions = {}
): { particles: Phaser.GameObjects.Particles.ParticleEmitter; cleanup: () => void } {
	const {
		intensity = 1.0,
		color = 0x00eaff
	} = options;

	const particles = scene.add.particles(
		x, y,
		images.white_dot.key,
		{
			// Movement configuration - droplets rise upward
			speedY: { min: -60 * intensity, max: -100 * intensity },
			speedX: { min: -8 * intensity, max: 8 * intensity },

			// Visual properties
			tint: color,
			scale: { start: 2.0 * intensity, end: 0.3 * intensity },
			alpha: { start: 0.7, end: 0 },

			// Timing and behavior for continuous effect
			lifespan: 800,
			frequency: 120 / intensity,
			quantity: 1,

			// Visual effects
			blendMode: 'ADD',

			// Emit zone
			emitZone: {
				source: new Phaser.Geom.Circle(0, 0, 12),
				type: 'random'
			} as Phaser.Types.GameObjects.Particles.EmitZoneData,

			// Gravity
			gravityY: 15 * intensity
		}
	);

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
