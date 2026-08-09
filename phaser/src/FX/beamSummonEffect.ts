import * as animation from "@Utils/animation";
import { getSettings } from "@Models/OptionsStore";
import { env } from "@Env";
import * as constants from "@Constants";

const BEAM_SUMMON_EFFECT_CONFIG = {
	// How long the beam takes to travel from the top of the screen to the slot.
	DESCEND_DURATION: 350,
	// How long the beam lingers at the slot before fading out.
	HOLD_DURATION: 150,
	// How long the beam takes to fade out.
	FADE_DURATION: 250,
	// Width of the beam column.
	BEAM_WIDTH: 60,
	// Width of the beam at its widest (the "flare" near the impact point).
	BEAM_MAX_WIDTH: 110,
	// Radius of the impact flash.
	FLASH_RADIUS: 90,
	COLORS: [0xffffff, 0xffffaa, 0xccddff],
} as const;

/**
 * Summon effect that looks like a unit being "beamed" down from a ship.
 * A column of light descends from the top of the screen to the target slot,
 * flashes on impact, then fades out.
 */
export async function beamSummonEffect({ x, y }: { x: number; y: number }) {
	const {
		DESCEND_DURATION,
		HOLD_DURATION,
		FADE_DURATION,
		BEAM_WIDTH,
		BEAM_MAX_WIDTH,
		FLASH_RADIUS,
		COLORS,
	} = BEAM_SUMMON_EFFECT_CONFIG;

	const particlesOption = getSettings().particles;
	let multiplier = 1;
	if (particlesOption === "low") multiplier = 0.5;
	else if (particlesOption === "high") multiplier = 2;

	const scene = env.scene;
	const topY = -constants.TILE_HEIGHT;
	const beamHeight = y - topY;

	// The main beam column — a tall, thin rectangle that descends from the top.
	// Origin is at the top-center, so scaling Y from 0 to 1 makes it grow
	// downward from the top of the screen toward the slot.
	const beam = scene.add.rectangle(x, topY, BEAM_WIDTH, beamHeight, 0xffffff, 0.9);
	beam.setBlendMode(Phaser.BlendModes.ADD);
	beam.setOrigin(0.5, 0);
	beam.setScale(1, 0);

	// A wider, softer glow around the beam.
	const glow = scene.add.rectangle(x, topY, BEAM_MAX_WIDTH, beamHeight, 0xccddff, 0.35);
	glow.setBlendMode(Phaser.BlendModes.ADD);
	glow.setOrigin(0.5, 0);
	glow.setScale(1, 0);

	// Impact flash at the slot.
	const flash = scene.add.circle(x, y, FLASH_RADIUS, 0xffffff, 0);
	flash.setBlendMode(Phaser.BlendModes.ADD);

	// Small rising particles at the impact point for extra flair.
	const particles: Phaser.GameObjects.Rectangle[] = [];
	const particleCount = Math.floor(6 * multiplier);
	for (let i = 0; i < particleCount; i++) {
		const angle = Math.random() * Math.PI * 2;
		const radius = Math.random() * FLASH_RADIUS * 0.5;
		const startX = x + Math.cos(angle) * radius;
		const startY = y + Math.sin(angle) * radius;
		const color = COLORS[Math.floor(Math.random() * COLORS.length)];
		const size = Phaser.Math.FloatBetween(6, 12);

		const rect = scene.add.rectangle(startX, startY, size, size, color, 1);
		rect.setBlendMode(Phaser.BlendModes.ADD);
		particles.push(rect);

		scene.tweens.add({
			targets: rect,
			y: startY - Phaser.Math.FloatBetween(40, 90),
			alpha: 0,
			duration: FADE_DURATION + HOLD_DURATION,
			ease: "Cubic.easeOut",
			onComplete: () => {
				rect.destroy();
			},
		});
	}

	// Descend the beam from the top to the slot by growing it downward.
	await animation.tween({
		targets: [beam, glow],
		scaleY: 1,
		duration: DESCEND_DURATION,
		ease: "Cubic.easeIn",
	});

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

	// Hold briefly, then fade the beam out.
	await animation.delay(HOLD_DURATION);

	await animation.tween({
		targets: [beam, glow],
		alpha: 0,
		duration: FADE_DURATION,
		ease: "Cubic.easeOut",
	});

	beam.destroy();
	glow.destroy();

	particles.forEach((rect) => {
		if (rect.active) {
			rect.destroy();
		}
	});
}
