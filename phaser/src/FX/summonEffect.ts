import * as animation from "@Utils/animation";
import * as Assets from "@assets";
import * as OptionsStore from "@Models/OptionsStore";

const SUMMON_EFFECT_CONFIG = {
	LIFESPAN: 200,
	SCALE_START: 1.25,
	SCALE_END: 4.3,
	SPEED_MIN: 100,
	SPEED_MAX: 200,
	PARTICLE_QUANTITY: 4,
	EMIT_ZONE_RADIUS: 10,
	EMIT_ZONE_QUANTITY: 8,
};

export async function summonEffect({ x, y }: { x: number; y: number }) {
	const {
		LIFESPAN,
		SCALE_START,
		SCALE_END,
		SPEED_MIN,
		SPEED_MAX,
		PARTICLE_QUANTITY,
		EMIT_ZONE_RADIUS,
		EMIT_ZONE_QUANTITY,
	} = SUMMON_EFFECT_CONFIG;

	const particlesOption = OptionsStore.getOption("particles");
	let multiplier = 1;
	if (particlesOption === "low") multiplier = 0.5;
	else if (particlesOption === "high") multiplier = 2;

	const summonEffect = io.scene.add.particles(x, y, Assets.images.light_pillar.key, {
		lifespan: LIFESPAN,
		scale: { start: SCALE_START, end: SCALE_END },
		alpha: { start: 1, end: 0 },
		speed: { min: SPEED_MIN, max: SPEED_MAX },
		quantity: Math.floor(PARTICLE_QUANTITY * multiplier),
		frequency: LIFESPAN / 10, // Emit all at once
		rotate: { min: 0, max: 360 }, // Random rotation for variety
		blendMode: "ADD",
		emitZone: {
			type: "edge",
			source: new Phaser.Geom.Circle(0, 0, EMIT_ZONE_RADIUS),
			quantity: Math.floor(EMIT_ZONE_QUANTITY * multiplier),
			yoyo: false,
		},
	});

	await animation.delay(LIFESPAN);

	summonEffect.stop();

	await animation.delay(LIFESPAN);

	summonEffect.destroy();
}
