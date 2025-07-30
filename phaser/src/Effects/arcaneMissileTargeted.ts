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

	const duration = 200;

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
		segments: Math.floor(distance / 15), // More segments for smoother arc
		color: colors[0], // Use first color for the beam
	});

	beam.updateBeam();
	beam.setVisible(false);

	// Create a larger rectangle texture for angled beam effect
	const rectKey = 'arcane_missile_rect_big';
	const rectWidth = 12;
	const rectHeight = 12;
	if (!scene.textures.exists(rectKey)) {
		const g = scene.make.graphics({ x: 0, y: 0 });
		g.fillStyle(0xffffff, 1);
		g.fillRect(0, 0, rectWidth, rectHeight);
		g.generateTexture(rectKey, rectWidth, rectHeight);
		g.destroy();
	}

	// Create segmented, fading rectangles along the beam path, with amplitude and staggered appearance
	const segmentSprites: Phaser.GameObjects.Image[] = [];
	const points = beam.points;
	const totalSegments = points.length - 1;
	const amplitudeForSegments = amplitude * 2.2; // exaggerate amplitude for visual effect
	const travelTime = duration * speedMultiplier;
	const fadeDuration = travelTime * 1.1;
	const segmentDelay = travelTime / totalSegments;

	// Calculate direction and normal for amplitude
	const vec = new Phaser.Math.Vector2(target.x - source.x, target.y - source.y);
	const normal = new Phaser.Math.Vector2(-vec.y, vec.x).normalize();

	for (let i = 0; i < totalSegments; i++) {
		const p0 = points[i];
		const p1 = points[i + 1];
		// Calculate angle between segments
		const angle = Phaser.Math.Angle.Between(p0.x, p0.y, p1.x, p1.y);
		// Place rectangle at midpoint between p0 and p1
		const t = i / totalSegments;
		const midX = (p0.x + p1.x) / 2;
		const midY = (p0.y + p1.y) / 2;
		// Add amplitude offset (wavy effect)
		const wave = Math.sin(t * Math.PI * frequency);
		const offsetX = normal.x * wave * amplitudeForSegments;
		const offsetY = normal.y * wave * amplitudeForSegments;

		// Stagger creation for travel effect
		scene.time.delayedCall(i * segmentDelay, () => {
			const sprite = scene.add.image(midX + offsetX, midY + offsetY, rectKey);
			sprite.setRotation(angle);
			sprite.setScale(particleScale * 1.5, particleScale * 1.5); // make bigger
			sprite.setTint(colors[i % colors.length]);
			sprite.setAlpha(1);
			sprite.setBlendMode(Phaser.BlendModes.ADD);
			segmentSprites.push(sprite);
			// Animate alpha for trailing effect
			scene.tweens.add({
				targets: sprite,
				alpha: 0,
				duration: fadeDuration,
				delay: 0,
				x: sprite.x + (Math.random() - 0.5) * 40, // slight random offset for trailing effect
				y: sprite.y + (Math.random() - 0.5) * 40,
				ease: 'Cubic.easeIn',
			});
		});
	}

	// Wait for projectile to reach target (simulate travel time)
	await delay(scene, duration * speedMultiplier);

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

	try {
		onHit();
	} catch (error) {
		console.error('Error in arcaneMissileTargeted onHit callback:', error);
	}

	await delay(scene, 200);

	impactParticles.stop();

	await delay(scene, 2000);

	// Cleanup all resources
	beam.destroy();
	impactParticles.destroy();
	segmentSprites.forEach(sprite => sprite.destroy());
}
