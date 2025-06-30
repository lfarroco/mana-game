import { images } from "../assets";
import { delay } from "../Utils/animation";
import { EnergyBeam } from "./EnergyBeam";
import { ARCANE_MISSILE_CONFIG } from "../constants/constants";


type ArcaneMissileAnimationArgs = {
	scene: Scene;
	source: Point;
	target: Point;
	onHit?: () => void;
	colors?: number[];
}

export async function arcaneMissile({
	scene,
	source,
	target,
	onHit = () => { },
	colors = ARCANE_MISSILE_CONFIG.DEFAULT_COLORS
}: ArcaneMissileAnimationArgs) {

	const distance = Phaser.Math.Distance.BetweenPoints(source, target)

	const positiveOrNegative = Math.random() > 0.5 ? 1 : -1;

	const beam = new EnergyBeam(scene, {
		start: source,
		end: target,
		thickness: 1,
		amplitude: (ARCANE_MISSILE_CONFIG.BEAM_AMPLITUDE_RANDOM * Math.random() + ARCANE_MISSILE_CONFIG.BEAM_AMPLITUDE_BASE) * positiveOrNegative,
		frequency: Math.floor(Math.random() * ARCANE_MISSILE_CONFIG.BEAM_FREQUENCY_MAX + ARCANE_MISSILE_CONFIG.BEAM_FREQUENCY_MIN),
		segments: ARCANE_MISSILE_CONFIG.BEAM_SEGMENTS,
		color: ARCANE_MISSILE_CONFIG.BEAM_COLOR,
	});

	beam.updateBeam();
	beam.setVisible(false);

	const particles = scene.add.particles(
		0, 0,
		images.white_dot.key,
		{
			speed: ARCANE_MISSILE_CONFIG.PARTICLE_SPEED,
			tint: colors,
			lifespan: ARCANE_MISSILE_CONFIG.PARTICLE_LIFESPAN,
			alpha: { start: 1, end: 0 },
			scale: { start: ARCANE_MISSILE_CONFIG.PARTICLE_SCALE_START, end: ARCANE_MISSILE_CONFIG.PARTICLE_SCALE_END },
			blendMode: 'ADD',
			radial: true,
		}
	);

	const path = new Phaser.Curves.Path(beam.points[0].x, beam.points[0].y);

	beam.points.forEach((point,) => {
		path.lineTo(point);
	});

	const follower = scene.add.follower(
		path,
		source.x, source.y,
		images.white_dot.key,
	);


	const duration = distance;
	follower.setVisible(false);
	follower.startFollow({
		positionOnPath: true,
		duration,
	})

	//make particles follow follower
	particles.startFollow(follower);

	await delay(scene, distance * ARCANE_MISSILE_CONFIG.DURATION_MULTIPLIER);

	particles.stop()

	// impact effect
	const impact = scene.add.particles(
		target.x, target.y,
		images.white_dot.key,
		{
			speed: ARCANE_MISSILE_CONFIG.IMPACT_SPEED,
			tint: ARCANE_MISSILE_CONFIG.IMPACT_COLORS,
			lifespan: ARCANE_MISSILE_CONFIG.IMPACT_LIFESPAN,
			alpha: { start: ARCANE_MISSILE_CONFIG.IMPACT_ALPHA_START, end: 0 },
			scale: { start: ARCANE_MISSILE_CONFIG.IMPACT_SCALE_START, end: ARCANE_MISSILE_CONFIG.IMPACT_SCALE_END },
			blendMode: 'ADD',
		}
	);

	onHit();

	await delay(scene, ARCANE_MISSILE_CONFIG.IMPACT_DELAY);

	impact.stop();

	await delay(scene, ARCANE_MISSILE_CONFIG.IMPACT_LIFESPAN);

	beam.destroy();
	particles.destroy();
	impact.destroy();
}
