import { images } from "../assets";
import { delay, tween } from "../Utils/animation";
import { impactEffect } from "./impactEffect";

// --- Effect Configuration Constants ---
const FIREBALL_TRACE_LIFESPAN = 200;
const FIREBALL_TRAVEL_DURATION = 500; // ms
const FIREBALL_INITIAL_SCALE = 1.4;

const SHARED_FIRE_TINT_COLORS = [0xff0000, 0xffff00, 0xffa500]; // Red, Yellow, Orange

// Constants for the fireball particle system
const FIREBALL_PARTICLE_ALPHA = { start: 1, end: 0 };
const FIREBALL_PARTICLE_SCALE = { start: 4, end: 2 };
const FIREBALL_PARTICLE_ANGLE_OFFSET = 0.2; // Radians for spread
const FIREBALL_PARTICLE_MIN_SPEED_MULTIPLIER = 10;
const FIREBALL_PARTICLE_MAX_SPEED_MULTIPLIER = 400;

const ZERO_COORDINATE_VALUE = 0;
const WARN_ZERO_COORDINATE_PREFIX = "[fireballEffect] Aborting: Source or target is at (0,0).";

export async function fireballEffect(
	scene: Phaser.Scene,
	source: { x: number; y: number; },
	target: { x: number; y: number; },
) {

	if ((source.x === ZERO_COORDINATE_VALUE && source.y === ZERO_COORDINATE_VALUE) || (target.x === ZERO_COORDINATE_VALUE && target.y === ZERO_COORDINATE_VALUE)) {
		console.warn(`${WARN_ZERO_COORDINATE_PREFIX} Source: (${source.x},${source.y}), Target: (${target.x},${target.y})`);
		return;
	}

	const particles = fireball(source, target, scene, FIREBALL_TRACE_LIFESPAN, FIREBALL_TRAVEL_DURATION);
	particles.setScale(FIREBALL_INITIAL_SCALE);

	await delay(FIREBALL_TRAVEL_DURATION / 2);

	await impactEffect({
		scene,
		location: target,
		pointA: source,
		pointB: target
	});

	// Note: The centralized impactEffect handles its own cleanup

	// Clean up fireball particles after impact
	scene.time.addEvent({
		delay: 1000, // Give time for impact effect
		callback: () => {
			particles.destroy();
		}
	});
}

function fireball(
	source: Point,
	target: Point,
	scene: Scene,
	lifespan: number,
	travelDuration: number,
) {
	const angle = Phaser.Math.Angle.BetweenPoints(source, target);
	const particles = scene.add.particles(
		source.x, source.y,
		images.white_dot.key,
		{
			// make particles move in the direction of the angle, using the speed
			speedX: {
				min: -Math.cos(angle - FIREBALL_PARTICLE_ANGLE_OFFSET) * FIREBALL_PARTICLE_MIN_SPEED_MULTIPLIER,
				max: -Math.cos(angle + FIREBALL_PARTICLE_ANGLE_OFFSET) * FIREBALL_PARTICLE_MAX_SPEED_MULTIPLIER
			},
			speedY: {
				min: -Math.sin(angle - FIREBALL_PARTICLE_ANGLE_OFFSET) * FIREBALL_PARTICLE_MIN_SPEED_MULTIPLIER,
				max: -Math.sin(angle + FIREBALL_PARTICLE_ANGLE_OFFSET) * FIREBALL_PARTICLE_MAX_SPEED_MULTIPLIER
			},
			//red, yellow and orage tones
			tint: SHARED_FIRE_TINT_COLORS,
			lifespan,
			alpha: FIREBALL_PARTICLE_ALPHA,
			scale: FIREBALL_PARTICLE_SCALE,
			blendMode: 'ADD',
			radial: true,
		}
	);

	tween({
		targets: [particles],
		x: target.x,
		y: target.y,
		duration: travelDuration,
		onComplete: () => particles.stop()
	});

	return particles;
}
