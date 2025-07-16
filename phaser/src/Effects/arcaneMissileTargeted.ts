/**
 * @file Targeted Arcane Missile Effect Implementation
 * Creates a customizable arcane missile that travels from source to target with a callback on impact.
 * This is a more refined version with smaller amplitude and particles, designed for targeted abilities.
 */

import { EnergyBeam } from './EnergyBeam';
import { images } from '../assets';
import { delay } from '../Utils/animation';

export interface TargetedArcaneMissileOptions {
	/** Colors for the projectile particles - defaults to light blue neon */
	colors?: number[];
	/** Amplitude range for the beam arc - defaults to gentle arc */
	amplitudeMin?: number;
	amplitudeMax?: number;
	/** Frequency range for the beam oscillation */
	frequencyMin?: number;
	frequencyMax?: number;
	/** Starting scale for the traveling particles */
	particleScale?: number;
	/** Speed multiplier for travel duration */
	speedMultiplier?: number;
	/** Impact effect options */
	impact?: {
		colors?: number[];
		scale?: number;
		speed?: number;
		lifespan?: number;
		alpha?: number;
	};
	/** Callback function to execute when the projectile hits the target */
	onHit?: () => void | Promise<void>;
}

/**
 * Creates a targeted arcane missile effect that travels from source to target
 * @param scene - The Phaser scene
 * @param source - Starting position {x, y}
 * @param target - Target position {x, y}
 * @param options - Customization options
 */
export async function arcaneMissileTargeted(
	scene: Phaser.Scene,
	source: { x: number; y: number },
	target: { x: number; y: number },
	options: TargetedArcaneMissileOptions = {}
): Promise<void> {
	const {
		colors = [0x00FFFF, 0x87CEEB, 0xADD8E6], // Light blue neon colors
		amplitudeMin = 5,
		amplitudeMax = 15,
		frequencyMin = 1,
		frequencyMax = 2,
		particleScale = 1.5,
		speedMultiplier = 2,
		impact = {
			colors: [0x00FFFF, 0x87CEEB],
			scale: 2,
			speed: 200,
			lifespan: 300,
			alpha: 0.4
		},
		onHit = () => { }
	} = options;

	const distance = Phaser.Math.Distance.BetweenPoints(source, target);

	// Create beam with customizable amplitude
	const positiveOrNegative = Math.random() > 0.5 ? 1 : -1;
	const amplitude = (Math.random() * (amplitudeMax - amplitudeMin) + amplitudeMin) * positiveOrNegative;
	const frequency = Math.floor(Math.random() * (frequencyMax - frequencyMin + 1) + frequencyMin);

	const beam = new EnergyBeam(scene, {
		start: source,
		end: target,
		thickness: 1,
		amplitude,
		frequency,
		segments: 20,
		color: colors[0], // Use first color for the beam
	});

	beam.updateBeam();
	beam.setVisible(false);

	// Create traveling particles
	const particles = scene.add.particles(
		0, 0,
		images.white_dot.key,
		{
			speed: 20,
			tint: colors,
			lifespan: 600,
			alpha: { start: 1, end: 0 },
			scale: { start: particleScale, end: 0 },
			blendMode: 'ADD',
			radial: true,
		}
	);

	// Create path from beam points
	const path = new Phaser.Curves.Path(beam.points[0].x, beam.points[0].y);
	beam.points.forEach((point) => {
		path.lineTo(point);
	});

	const follower = scene.add.follower(
		path,
		source.x, source.y,
		images.white_dot.key,
	);

	const travelDuration = distance;
	follower.setVisible(false);
	follower.startFollow({
		positionOnPath: true,
		duration: travelDuration,
	});

	// Make particles follow follower
	particles.startFollow(follower);

	// Wait for projectile to reach target
	await delay(scene, distance * speedMultiplier);

	particles.stop();

	// Create impact effect
	const impactParticles = scene.add.particles(
		target.x, target.y,
		images.white_dot.key,
		{
			speed: impact.speed || 200,
			tint: impact.colors || [0x00FFFF, 0x87CEEB],
			lifespan: impact.lifespan || 300,
			alpha: { start: impact.alpha || 0.4, end: 0 },
			scale: { start: impact.scale || 2, end: 0 },
			blendMode: 'ADD',
		}
	);

	// MOMENT OF IMPACT - Execute the callback
	try {
		await onHit();
	} catch (error) {
		console.error('Error in arcaneMissileTargeted onHit callback:', error);
	}

	await delay(scene, 200);

	impactParticles.stop();

	await delay(scene, 300);

	// Cleanup all resources
	beam.destroy();
	particles.destroy();
	impactParticles.destroy();
	follower.destroy();
}
