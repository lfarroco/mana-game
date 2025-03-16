import { asVec2, sumVec2, vec2 } from "../Models/Geometry";
import { TILE_WIDTH } from "../Scenes/Battleground/constants";
import { delay, tween } from "../Utils/animation";

export async function fireballEffect(
	scene: Phaser.Scene,
	speed: number,
	source: { x: number; y: number; },
	target: { x: number; y: number; },
) {

	const travelDuration = 500 / speed;
	const lifespan = 400 / speed;

	const particles = fireball(source, target, scene, speed, lifespan, travelDuration);
	particles.setScale(2.4)

	await delay(scene, travelDuration);

	const impact = impactEffect(scene, target, speed, lifespan);

	scene.time.addEvent({
		delay: lifespan,
		callback: () => {
			impact.stop();
		}
	});

	[
		vec2(0, -TILE_WIDTH),
		vec2(0, TILE_WIDTH),
		vec2(TILE_WIDTH, 0),
		vec2(-TILE_WIDTH, 0),
		vec2(TILE_WIDTH, TILE_WIDTH),
		vec2(-TILE_WIDTH, -TILE_WIDTH),
		vec2(-TILE_WIDTH, TILE_WIDTH),
		vec2(TILE_WIDTH, -TILE_WIDTH),

	]
		.map(v => impactEffect(scene, sumVec2(asVec2(target))(v), speed, lifespan / 3))

	scene.time.addEvent({
		delay: lifespan * 2,
		callback: () => {
			particles.destroy();
			impact.destroy();
		}
	});
}
function impactEffect(scene: Phaser.Scene, target: { x: number; y: number; }, speed: number, lifespan: number) {
	return scene.add.particles(
		target.x,
		target.y,
		'white-dot',
		{
			speed: 300 * speed,
			tint: [0xff0000, 0xffff00, 0xffa500],
			lifespan: lifespan,
			alpha: { start: 0.5, end: 0 },
			scale: { start: 4, end: 8 },
			blendMode: 'ADD',
			frequency: 5,
			stopAfter: 15
		}
	);
}

function fireball(source: { x: number; y: number; }, target: { x: number; y: number; }, scene: Phaser.Scene, speed: number, lifespan: number, travelDuration: number) {
	const angle = Phaser.Math.Angle.BetweenPoints(source, target);
	const particles = scene.add.particles(
		source.x,
		source.y,
		'white-dot',
		{
			// make particles move in the direction of the angle, using the speed
			speedX: {
				min: -Math.cos(angle - 0.2) * 200 * speed,
				max: -Math.cos(angle + 0.2) * 400 * speed
			},
			speedY: {
				min: -Math.sin(angle - 0.2) * 200 * speed,
				max: -Math.sin(angle + 0.2) * 400 * speed
			},
			//red, yellow and orage tones
			tint: [0xff0000, 0xffff00, 0xffa500],
			lifespan,
			alpha: { start: 1, end: 0 },
			scale: { start: 8, end: 0 },
			blendMode: 'ADD',
			radial: true,
			stopAfter: travelDuration
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

