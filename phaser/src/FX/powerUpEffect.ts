import * as animation from "@Utils/animation";
import { getSettings } from "@Models/OptionsStore";
import { env } from "@Env";
import * as AudioManager from "@Systems/AudioManager";
import { HALF_TILE_HEIGHT } from "@Constants";

const POWER_UP_EFFECT_CONFIG = {
	// How long the beam takes to rise from the unit's slot to the top of the screen.
	RISE_DURATION: 350,
	// How long the beam lingers before fading out.
	HOLD_DURATION: 350,
	// How long the beam takes to fade out.
	FADE_DURATION: 300,
	// Number of beam groups. Each group is 3 stacked rects that spread outward
	// once the beam is fully risen (center stays, left/right move out) — like
	// the summon beam, but the spread happens at the top of the rise.
	BEAM_GROUP_COUNT: 3,
	// Base width of a beam group's rects.
	BEAM_WIDTH: 20,
	// Random width jitter applied per group (so groups differ in thickness).
	BEAM_WIDTH_JITTER: 25,
	// Random horizontal jitter applied to each group's starting position, so
	// the three rising columns don't perfectly overlap.
	BEAM_X_JITTER: 12,
	// Random vertical jitter applied to each group's starting position.
	BEAM_Y_JITTER: 8,
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
	// Radius of the golden flash at the unit when the power-up begins.
	FLASH_RADIUS: 200,
	// Golden/yellow palette — the summon beam's palette recast in gold.
	COLORS: [0xffd700, 0xffff66, 0xffcc00],
} as const;

type BeamGroup = {
	x: number;
	y: number;
	left: Phaser.GameObjects.Rectangle;
	center: Phaser.GameObjects.Rectangle;
	right: Phaser.GameObjects.Rectangle;
	spread: number;
	outwardDuration: number;
};

/**
 * Power-up effect played when a unit is promoted (bronze -> silver -> gold ->
 * platinum). The summon beam played in reverse: instead of a column of light
 * descending from the sky onto the slot, a golden column of light emerges from
 * the unit and rises up toward the top of the screen.
 *
 * Same structure as the summon beam: several groups of 3 stacked rects, a flash
 * at the unit, and rising particles. The flash and the onStart callback fire
 * when the beam begins to rise (the summon beam fires its impact at the end).
 */
export async function powerUpEffect({ x, y }: { x: number; y: number }, onStart?: () => void) {
	const {
		RISE_DURATION,
		HOLD_DURATION,
		FADE_DURATION,
		BEAM_GROUP_COUNT,
		BEAM_WIDTH,
		BEAM_WIDTH_JITTER,
		BEAM_X_JITTER,
		BEAM_Y_JITTER,
		BEAM_ALPHA,
		OUTWARD_SPREAD,
		OUTWARD_SPREAD_JITTER,
		OUTWARD_DURATION,
		OUTWARD_DURATION_JITTER,
		FLASH_RADIUS,
		COLORS,
	} = POWER_UP_EFFECT_CONFIG;

	const particlesOption = getSettings().particles;
	let multiplier = 1;
	if (particlesOption === "low") multiplier = 0.5;
	else if (particlesOption === "high") multiplier = 2;

	const { scene } = env;
	const topY = 0;
	// The beam column spans from the unit's slot up to the top of the screen —
	// the same height as the summon beam's column (which spans top -> slot).
	const beamHeight = y + HALF_TILE_HEIGHT / 4 + topY;
	// The bottom anchor of the column sits at the slot.
	const beamBottomY = y + HALF_TILE_HEIGHT / 4;

	// Build the beam groups. Each group is 3 rects stacked at a slightly
	// randomized position around the slot. Origin is at the bottom-center, so
	// scaling Y from 0 to 1 makes them grow upward from the slot toward the
	// top of the screen.
	const beamGroups: BeamGroup[] = [];
	for (let g = 0; g < BEAM_GROUP_COUNT; g++) {
		const groupX = x + Phaser.Math.FloatBetween(-BEAM_X_JITTER, BEAM_X_JITTER);
		const groupY = beamBottomY + Phaser.Math.FloatBetween(-BEAM_Y_JITTER, BEAM_Y_JITTER);
		const width = BEAM_WIDTH + Phaser.Math.FloatBetween(-BEAM_WIDTH_JITTER, BEAM_WIDTH_JITTER);
		const spread =
			width *
			Phaser.Math.FloatBetween(
				OUTWARD_SPREAD - OUTWARD_SPREAD_JITTER,
				OUTWARD_SPREAD + OUTWARD_SPREAD_JITTER
			);
		const outwardDuration =
			OUTWARD_DURATION +
			Phaser.Math.FloatBetween(-OUTWARD_DURATION_JITTER, OUTWARD_DURATION_JITTER);
		const heightJitter = () => Math.random() * 50;
		const color = COLORS[g % COLORS.length];

		const left = scene.add.rectangle(
			groupX,
			groupY,
			width,
			beamHeight + heightJitter(),
			color,
			BEAM_ALPHA
		);
		const center = scene.add.rectangle(
			groupX,
			groupY,
			width,
			beamHeight + heightJitter(),
			color,
			BEAM_ALPHA
		);
		const right = scene.add.rectangle(
			groupX,
			groupY,
			width,
			beamHeight + heightJitter(),
			color,
			BEAM_ALPHA
		);
		[left, center, right].forEach((rect) => {
			rect.setBlendMode(Phaser.BlendModes.ADD);
			rect.setOrigin(0.5, 1);
			rect.setScale(1, 0);
		});

		beamGroups.push({ x: groupX, y: groupY, left, center, right, spread, outwardDuration });
	}

	const allBeamRects = beamGroups.flatMap((group) => [group.left, group.center, group.right]);

	// Golden impact flash at the unit.
	const flash = scene.add.circle(x, y, FLASH_RADIUS, COLORS[0], 0);
	flash.setBlendMode(Phaser.BlendModes.ADD);

	// Small rising particles at the unit for extra flair (golden, like the beam).
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
			onComplete: () => {
				rect.destroy();
			},
		});
	}

	// The power-up begins — fire the start callback so the caller can sync the
	// unit's rank display change with the flash and the rising beam.
	onStart?.();

	// Play the power-up "rising golden beam" sound when the effect starts.
	AudioManager.playSoundEffect("sfx_spell_innerfocus");

	// Flash on start.
	scene.tweens.add({
		targets: flash,
		alpha: 0.9,
		duration: 60,
		yoyo: true,
		onComplete: () => {
			flash.destroy();
		},
	});

	// Rise the beam from the slot to the top of the screen.
	await animation.tween({
		targets: allBeamRects,
		scaleY: 1,
		duration: RISE_DURATION,
		ease: "Cubic.easeOut",
	});

	// Widen the beam: the outer rects of each group slide outward while the
	// center stays put (same spread as the summon beam's impact). The spread is
	// relative to each group's own starting position.
	beamGroups.forEach(({ x: groupX, left, right, spread, outwardDuration }) => {
		scene.tweens.add({
			targets: left,
			x: groupX - spread,
			duration: outwardDuration,
			ease: "Cubic.easeOut",
		});
		scene.tweens.add({
			targets: right,
			x: groupX + spread,
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
