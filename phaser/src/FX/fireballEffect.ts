import * as animation from "@Utils/animation";
import * as impactEffect from "./impactEffect";
import { env } from "@Env";

// --- Effect Configuration Constants ---
const FIREBALL_TRAVEL_DURATION = 500; // ms
const FIREBALL_INITIAL_SCALE = 1.4;

const SHARED_FIRE_TINT_COLORS = [0xff0000, 0xffff00, 0xffa500]; // Red, Yellow, Orange

// Constants for the fireball trail
const FIREBALL_TRAIL_COUNT = 12;
const FIREBALL_TRAIL_SIZE_MIN = 16;
const FIREBALL_TRAIL_SIZE_MAX = 32;
const FIREBALL_TRAIL_ALPHA = 0.9;

const ZERO_COORDINATE_VALUE = 0;
const WARN_ZERO_COORDINATE_PREFIX = "[fireballEffect] Aborting: Source or target is at (0,0).";

export async function fireballEffect(
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

	const rects = fireball(
		[sx, sy],
		[tx, ty],
		FIREBALL_TRAVEL_DURATION
	);

	await animation.delay(FIREBALL_TRAVEL_DURATION / 2);

	await impactEffect.impactEffect({
		location: [tx, ty],
		pointA: [sx, sy],
		pointB: [tx, ty],
		colors: SHARED_FIRE_TINT_COLORS,
	});

	// Clean up any remaining trail rects after impact
	rects.forEach((rect) => {
		if (rect.active) {
			rect.destroy();
		}
	});
}

function fireball(
	[sx, sy]: Vec2,
	[tx, ty]: Vec2,
	travelDuration: number
) {
	const scene = env.scene;
	const rects: Phaser.GameObjects.Rectangle[] = [];

	for (let i = 0; i < FIREBALL_TRAIL_COUNT; i++) {
		const t = i / (FIREBALL_TRAIL_COUNT - 1);
		const x = sx + (tx - sx) * t;
		const y = sy + (ty - sy) * t;
		const color = SHARED_FIRE_TINT_COLORS[Math.floor(Math.random() * SHARED_FIRE_TINT_COLORS.length)];
		const size = Phaser.Math.FloatBetween(FIREBALL_TRAIL_SIZE_MIN, FIREBALL_TRAIL_SIZE_MAX);

		const rect = scene.add.rectangle(x, y, size, size, color, FIREBALL_TRAIL_ALPHA);
		rect.setBlendMode(Phaser.BlendModes.ADD);
		rect.setScale(FIREBALL_INITIAL_SCALE);
		rects.push(rect);

		scene.tweens.add({
			targets: rect,
			alpha: 0,
			scaleX: 0,
			scaleY: 0,
			duration: travelDuration,
			delay: t * travelDuration,
			ease: "Cubic.easeOut",
			onComplete: () => {
				rect.destroy();
			},
		});
	}

	return rects;
}
