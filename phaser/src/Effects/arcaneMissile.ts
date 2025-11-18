import { images } from "../assets";
import { delay } from "@Utils/animation";
import { EnergyBeam } from "./EnergyBeam";

const ARCANE_MISSILE_CONFIG = {
	DEFAULT_COLORS: [0xff00ff, 0x0000ff, 0x000000] as number[],
	BEAM_AMPLITUDE_BASE: 30,
	BEAM_AMPLITUDE_RANDOM: 100,
	BEAM_FREQUENCY_MIN: 1,
	BEAM_FREQUENCY_MAX: 3,
	BEAM_SEGMENTS: 20,
	BEAM_COLOR: 0x00ffff,
	PARTICLE_SPEED: 20,
	PARTICLE_LIFESPAN: 600,
	PARTICLE_SCALE_START: 4,
	PARTICLE_SCALE_END: 0,
	DURATION_MULTIPLIER: 2,
	IMPACT_SPEED: 300,
	IMPACT_COLORS: [0x800080, 0x0000ff] as number[],
	IMPACT_LIFESPAN: 400,
	IMPACT_SCALE_START: 6,
	IMPACT_SCALE_END: 0,
	IMPACT_ALPHA_START: 0.5,
	IMPACT_DELAY: 300,
};

type ArcaneMissileAnimationArgs = {
	scene: Scene;
	source: Vec2;
	target: Vec2;
	onHit?: () => void;
	colors?: number[];
};

export async function arcaneMissile({
	scene,
	source,
	target,
	onHit = () => {},
	colors = ARCANE_MISSILE_CONFIG.DEFAULT_COLORS,
}: ArcaneMissileAnimationArgs) {
	const duration = 200;

	const positiveOrNegative = Math.random() > 0.5 ? 1 : -1;

	const beam = new EnergyBeam(scene, {
		start: source,
		end: target,
		thickness: 1,
		amplitude:
			(ARCANE_MISSILE_CONFIG.BEAM_AMPLITUDE_RANDOM * Math.random() +
				ARCANE_MISSILE_CONFIG.BEAM_AMPLITUDE_BASE) *
			positiveOrNegative,
		frequency: Math.floor(
			Math.random() * ARCANE_MISSILE_CONFIG.BEAM_FREQUENCY_MAX +
				ARCANE_MISSILE_CONFIG.BEAM_FREQUENCY_MIN
		),
		segments: ARCANE_MISSILE_CONFIG.BEAM_SEGMENTS,
		color: ARCANE_MISSILE_CONFIG.BEAM_COLOR,
	});

	beam.updateBeam();
	beam.setVisible(false);

	const particles = scene.add.particles(0, 0, images.white_dot.key, {
		speed: ARCANE_MISSILE_CONFIG.PARTICLE_SPEED,
		tint: colors,
		lifespan: ARCANE_MISSILE_CONFIG.PARTICLE_LIFESPAN,
		alpha: { start: 1, end: 0 },
		scale: {
			start: ARCANE_MISSILE_CONFIG.PARTICLE_SCALE_START,
			end: ARCANE_MISSILE_CONFIG.PARTICLE_SCALE_END,
		},
		blendMode: "ADD",
		radial: true,
	});

	const path = new Phaser.Curves.Path(beam.points[0].x, beam.points[0].y);

	beam.points.forEach((point) => {
		path.lineTo(point);
	});

	const follower = scene.add.follower(path, source.x, source.y, images.white_dot.key);

	follower.setVisible(false);
	follower.startFollow({
		positionOnPath: true,
		duration,
	});

	//make particles follow follower
	particles.startFollow(follower);

	await delay(duration);

	particles.stop();

	// impact effect
	const impact = scene.add.particles(target.x, target.y, images.white_dot.key, {
		speed: ARCANE_MISSILE_CONFIG.IMPACT_SPEED,
		tint: ARCANE_MISSILE_CONFIG.IMPACT_COLORS,
		lifespan: ARCANE_MISSILE_CONFIG.IMPACT_LIFESPAN,
		alpha: { start: ARCANE_MISSILE_CONFIG.IMPACT_ALPHA_START, end: 0 },
		scale: {
			start: ARCANE_MISSILE_CONFIG.IMPACT_SCALE_START,
			end: ARCANE_MISSILE_CONFIG.IMPACT_SCALE_END,
		},
		blendMode: "ADD",
	});

	onHit();

	await delay(ARCANE_MISSILE_CONFIG.IMPACT_DELAY);

	impact.stop();

	await delay(ARCANE_MISSILE_CONFIG.IMPACT_LIFESPAN);

	beam.destroy();
	particles.destroy();
	impact.destroy();
}
