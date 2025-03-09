import { delay } from "../Utils/animation";
import { EnergyBeam } from "./EnergyBeam";

export async function arcaneMissle(
	scene: Phaser.Scene,
	source: { x: number; y: number; },
	target: { x: number; y: number; },
	speed: number,
) {

	const positiveOrNegative = Math.random() > 0.5 ? 1 : -1;

	const beam = new EnergyBeam(scene, {
		start: source,
		end: target,
		thickness: 1,
		amplitude: (200 * Math.random() + 30) * positiveOrNegative,
		frequency: Math.floor(Math.random() * 3 + 1),
		segments: 20,
		color: 0x00FFFF,
	});

	beam.updateBeam();
	beam.setVisible(false);

	const particles = scene.add.particles(
		0,
		0,
		'white-dot',
		{
			speed: 100 * speed,
			// purple to blue tones
			tint: [0x800080, 0x0000FF],
			lifespan: 300 / speed,
			alpha: { start: 1, end: 0 },
			scale: { start: 3, end: 0 },
			blendMode: 'ADD',
			radial: true,
		}
	);

	const path = new Phaser.Curves.Path(beam.points[0].x, beam.points[0].y);

	beam.points.forEach((point,) => {
		path.lineTo(point);
	});

	const follower = scene.add.follower(path, source.x, source.y, 'white-dot');

	const duration = (500 * Math.random() + 500) / speed;
	follower.setVisible(false);
	follower.startFollow({
		positionOnPath: true,
		duration,
	})

	//make particles follow follower
	particles.startFollow(follower);

	await delay(scene, duration);

	particles.stop()

	// impact effect
	const impact = scene.add.particles(
		target.x,
		target.y,
		'white-dot',
		{
			speed: 300 * speed,
			// purple to blue tones
			tint: [0x800080, 0x0000FF],
			lifespan: 200 / speed,
			alpha: { start: 0.5, end: 0 },
			scale: { start: 3, end: 0 },
			blendMode: 'ADD',
		}
	);


	scene.time.addEvent({
		delay: 300 / speed,
		callback: () => {
			impact.stop();
		}
	});

	scene.time.addEvent({
		delay: 500 / speed,
		callback: () => {

			beam.destroy();
			particles.destroy();
			impact.destroy();
		}
	});
}
