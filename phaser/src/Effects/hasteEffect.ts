/**
 * @file Haste Effect Implementation
 * Creates a visual effect showing light-blue droplets moving upwards to indicate haste status.
 */

import { images } from "../assets";
import * as AudioManager from "../Systems/AudioManager";
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
		duration = 500,
		intensity = 2.0,
		color = 0x00eaff
	} = options;

	try {
		AudioManager.playSoundEffect('sfx_artifact_equipmask');
	} catch (error) {
		console.warn('Could not play haste effect sound:', error);
	}

	// Create upward-moving droplet particles
	const particles = scene.add.particles(
		x, y,
		images.light_pillar.key,
		{
			// Movement configuration - droplets rise upward
			speedY: { min: -20 * intensity, max: -60 * intensity },
			speedX: { min: -10 * intensity, max: 10 * intensity }, // Slight horizontal drift
			// Visual properties - remove the general scale since we're using scaleX/Y
			tint: color,
			alpha: { start: 0.8, end: 0 },
			// Timing and behavior
			lifespan: duration,
			frequency: 150 / intensity, // Much less frequent for wider spacing
			quantity: Math.max(1, Math.floor(1 * intensity)),

			// Visual effects - very thin oval droplet shape
			scaleX: { start: 0.8 * intensity, end: 0.0 }, // Much thinner width
			scaleY: { start: 1.5 * intensity, end: 1.7 * intensity }, // Taller height for droplet shape
			blendMode: 'ADD',

			// Emit zone - character sprite area coverage
			emitZone: {
				source: new Phaser.Geom.Circle(0, 0, 40),
				type: 'random'
			} as Phaser.Types.GameObjects.Particles.EmitZoneData,

			// Gravity effect to make droplets feel more natural
			gravityY: 20 * intensity // Slight upward resistance
		}
	);

	// Let the effect run for its duration
	await delay(duration);

	// Stop emitting new particles
	particles.stop();

	// Wait for existing particles to fade out
	await delay(duration);

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
			// Visual properties - very thin oval droplet shape for continuous effect
			tint: color,
			scaleX: { start: 0.6 * intensity, end: 0.08 * intensity }, // Very thin width
			scaleY: { start: 3.0 * intensity, end: 0.6 * intensity }, // Taller height for droplet shape
			alpha: { start: 0.7, end: 0 },

			// Timing and behavior for continuous effect
			lifespan: 800,
			frequency: 300 / intensity, // Much less frequent for wider spacing
			quantity: 1,

			// Visual effects
			blendMode: 'ADD',

			// Emit zone - character sprite area coverage
			emitZone: {
				source: new Phaser.Geom.Circle(0, 0, 35),
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
