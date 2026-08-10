import * as animation from "@Utils/animation";
import { getSettings } from "@Models/OptionsStore";
import { env } from "@Env";
import { HALF_TILE_HEIGHT } from "@Constants";

const BEAM_SUMMON_EFFECT_CONFIG = {
	// How long the beam takes to travel from the top of the screen to the slot.
	DESCEND_DURATION: 350,
	// How long the beam lingers at the slot before fading out.
	HOLD_DURATION: 300,
	// How long the beam takes to fade out.
	FADE_DURATION: 250,
	// Number of beam groups. Each group is 3 stacked rects that spread outward
	// on impact (center stays, left/right move out) — like "<-|  |  | ->".
	BEAM_GROUP_COUNT: 3,
	// Base width of a beam group's rects.
	BEAM_WIDTH: 20,
	// Random width jitter applied per group (so groups differ in thickness).
	BEAM_WIDTH_JITTER: 25,
	// Alpha of each beam rect.
	BEAM_ALPHA: 0.7,
	// How far the outer rects travel outward, as a multiple of the group width.
	OUTWARD_SPREAD: 1.3,
	// Random jitter on the outward travel distance (per group).
	OUTWARD_SPREAD_JITTER: 0.35,
	// Base duration for the outward expansion.
	OUTWARD_DURATION: 220,
	// Random jitter on the outward expansion duration (per group).
	OUTWARD_DURATION_JITTER: 140,
	// Radius of the impact flash.
	FLASH_RADIUS: 240,
	COLORS: [0xffffff, 0xffffaa, 0xccddff],
} as const;

type BeamGroup = {
	left: Phaser.GameObjects.Rectangle;
	center: Phaser.GameObjects.Rectangle;
	right: Phaser.GameObjects.Rectangle;
	spread: number;
	outwardDuration: number;
};

/**
 * Summon effect that looks like a unit being "beamed" down from a ship.
 * A column of light descends from the top of the screen to the target slot,
 * flashes on impact, then fades out.
 *
 * The beam is made of several groups of 3 stacked rects. On impact the two
 * outer rects of each group slide outward (the center stays), widening the
 * beam. Width and outward speed vary per group for a more organic look.
 */
export async function beamSummonEffect(
	{ x, y }: { x: number; y: number },
	onImpact?: () => void
) {

	const {
		DESCEND_DURATION,
		HOLD_DURATION,
		FADE_DURATION,
		BEAM_GROUP_COUNT,
		BEAM_WIDTH,
		BEAM_WIDTH_JITTER,
		BEAM_ALPHA,
		OUTWARD_SPREAD,
		OUTWARD_SPREAD_JITTER,
		OUTWARD_DURATION,
		OUTWARD_DURATION_JITTER,
		FLASH_RADIUS,
		COLORS,
	} = BEAM_SUMMON_EFFECT_CONFIG;

	const particlesOption = getSettings().particles;
	let multiplier = 1;
	if (particlesOption === "low") multiplier = 0.5;
	else if (particlesOption === "high") multiplier = 2;

	const { scene } = env;
	const topY = 0;
	const beamHeight = y + HALF_TILE_HEIGHT / 4 + topY;

	// Build the beam groups. Each group is 3 rects stacked at the slot's x.
	// Origin is at the top-center, so scaling Y from 0 to 1 makes them grow
	// downward from the top of the screen toward the slot.
	const beamGroups: BeamGroup[] = [];
	for (let g = 0; g < BEAM_GROUP_COUNT; g++) {
		const width = BEAM_WIDTH + Phaser.Math.FloatBetween(-BEAM_WIDTH_JITTER, BEAM_WIDTH_JITTER);
		const spread = width * Phaser.Math.FloatBetween(
			OUTWARD_SPREAD - OUTWARD_SPREAD_JITTER,
			OUTWARD_SPREAD + OUTWARD_SPREAD_JITTER
		);
		const outwardDuration = OUTWARD_DURATION + Phaser.Math.FloatBetween(
			-OUTWARD_DURATION_JITTER,
			OUTWARD_DURATION_JITTER
		);
		const heightJitter = () => Math.random() * 50;

		const left = scene.add.rectangle(x, topY, width, beamHeight + heightJitter(), 0xffffff, BEAM_ALPHA);
		const center = scene.add.rectangle(x, topY, width, beamHeight + heightJitter(), 0xffffff, BEAM_ALPHA);
		const right = scene.add.rectangle(x, topY, width, beamHeight + heightJitter(), 0xffffff, BEAM_ALPHA);
		[left, center, right].forEach((rect) => {
			rect.setBlendMode(Phaser.BlendModes.ADD);
			rect.setOrigin(0.5, 0);
			rect.setScale(1, 0);
		});

		beamGroups.push({ left, center, right, spread, outwardDuration });
	}

	const allBeamRects = beamGroups.flatMap((group) => [group.left, group.center, group.right]);

	// Impact flash at the slot.
	const flash = scene.add.circle(x, y, FLASH_RADIUS, 0xffffff, 0);
	flash.setBlendMode(Phaser.BlendModes.ADD);

	// Small rising particles at the impact point for extra flair.
	const particles: Phaser.GameObjects.Rectangle[] = [];
	const particleCount = Math.floor(36 * multiplier);
	for (let i = 0; i < particleCount; i++) {
		const angle = Math.random() * Math.PI * 2;
		const radius = Math.random() * FLASH_RADIUS * 0.5;
		const startX = x + Math.cos(angle) * radius;
		const startY = y + Math.sin(angle) * radius;
		const color = COLORS[Math.floor(Math.random() * COLORS.length)];
		const size = Phaser.Math.FloatBetween(20, 40);

		const rect = scene.add.rectangle(startX, startY, size, size, color, 1);
		rect.setBlendMode(Phaser.BlendModes.ADD);
		particles.push(rect);

		scene.tweens.add({
			targets: rect,
			y: startY - Phaser.Math.FloatBetween(50, 110),
			alpha: 0,
			duration: 900 + FADE_DURATION + HOLD_DURATION,
			ease: "Cubic.easeOut",
			onComplete: () => { rect.destroy(); },
		});
	}

	// Descend the beam from the top to the slot by growing it downward.
	await animation.tween({
		targets: allBeamRects,
		scaleY: 1,
		duration: DESCEND_DURATION,
		ease: "Cubic.easeIn",
	});

	// The beam has reached the slot — fire the impact callback so the unit
	// fade-from-white starts together with the particles and impact flash.
	onImpact?.();

	// Flash on impact.
	scene.tweens.add({
		targets: flash,
		alpha: 0.9,
		duration: 60,
		yoyo: true,
		onComplete: () => {
			flash.destroy();
		},
	});

	// Widen the beam: the outer rects of each group slide outward while the
	// center stays put. Each group has its own spread and speed.
	beamGroups.forEach(({ left, right, spread, outwardDuration }) => {
		scene.tweens.add({
			targets: left,
			x: x - spread,
			duration: outwardDuration,
			ease: "Cubic.easeOut",
		});
		scene.tweens.add({
			targets: right,
			x: x + spread,
			duration: outwardDuration,
			ease: "Cubic.easeOut",
		});
	});

	// Hold briefly, then fade the beam out.
	await animation.delay(HOLD_DURATION);

	await animation.tween({
		targets: allBeamRects,
		alpha: 0,
		duration: FADE_DURATION,
		ease: "Cubic.easeOut",
	});

	allBeamRects.forEach((rect) => rect.destroy());

	particles.forEach((rect) => {
		if (rect.active) {
			rect.destroy();
		}
	});
}
