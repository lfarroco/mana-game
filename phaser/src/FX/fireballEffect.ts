import * as Assets from "@assets";
import * as animation from "@Utils/animation";
import * as impactEffect from "./impactEffect";
import { env } from "@Env";

// TODO: try this for some alternative effects (power up, absorb,orb upgrade)


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
	[sx, sy]: Vec2,
	[tx, ty]: Vec2
) {
	if (
		(sx === ZERO_COORDINATE_VALUE && sy === ZERO_COORDINATE_VALUE) ||
		(tx === ZERO_COORDINATE_VALUE && ty === ZERO_COORDINATE_VALUE)
	) {
		console.warn("fireballEffect",
			`${WARN_ZERO_COORDINATE_PREFIX} Source: (${sx},${sy}), Target: (${tx},${ty})`
		);
		return;
	}

	const particles = fireball(
		[sx, sy],
		[tx, ty],
		FIREBALL_TRACE_LIFESPAN,
		FIREBALL_TRAVEL_DURATION
	);
	particles.setScale(FIREBALL_INITIAL_SCALE);

	await animation.delay(FIREBALL_TRAVEL_DURATION / 2);

	await impactEffect.impactEffect({
		location: [tx, ty],
		pointA: [sx, sy],
		pointB: [tx, ty],
	});

	// Note: The centralized impactEffect handles its own cleanup

	// Clean up fireball particles after impact
	scene.time.addEvent({
		delay: 1000, // Give time for impact effect
		callback: () => {
			particles.destroy();
		},
	});
}

function fireball(
	[sx, sy]: Vec2,
	[tx, ty]: Vec2,
	lifespan: number,
	travelDuration: number
) {
	const angle = Phaser.Math.Angle.BetweenPoints(
		{ x: sx, y: sy },
		{ x: tx, y: ty },
	);
	const particles = env.scene.add.particles(sx, sy, Assets.images.white_dot.key, {
		// make particles move in the direction of the angle, using the speed
		speedX: {
			min:
				-Math.cos(angle - FIREBALL_PARTICLE_ANGLE_OFFSET) * FIREBALL_PARTICLE_MIN_SPEED_MULTIPLIER,
			max:
				-Math.cos(angle + FIREBALL_PARTICLE_ANGLE_OFFSET) * FIREBALL_PARTICLE_MAX_SPEED_MULTIPLIER,
		},
		speedY: {
			min:
				-Math.sin(angle - FIREBALL_PARTICLE_ANGLE_OFFSET) * FIREBALL_PARTICLE_MIN_SPEED_MULTIPLIER,
			max:
				-Math.sin(angle + FIREBALL_PARTICLE_ANGLE_OFFSET) * FIREBALL_PARTICLE_MAX_SPEED_MULTIPLIER,
		},
		//red, yellow and orage tones
		tint: SHARED_FIRE_TINT_COLORS,
		lifespan,
		alpha: FIREBALL_PARTICLE_ALPHA,
		scale: FIREBALL_PARTICLE_SCALE,
		blendMode: "ADD",
		radial: true,
	});

	animation.tween({
		targets: [particles],
		x: tx,
		y: ty,
		duration: travelDuration,
		onComplete: () => particles.stop(),
	});

	return particles;
}
