import Phaser from "phaser";
import { Vec2 } from "../../../Models/Geometry";
import { delay } from "../../../Utils/animation";

export async function healingWave(scene: Phaser.Scene, targets: Vec2[]) {
	const duration = 1000;

	const keypoints = targets.flatMap(target => [target.x, target.y]);

	const curve = new Phaser.Curves.Spline(keypoints);

	const path = new Phaser.Curves.Path().add(curve);

	const follower = scene.add.follower(path, targets[0].x, targets[0].y, '');
	follower.setVisible(false);

	const particles = scene.add.particles(0, 0,
		'light-pillar',
		{
			speed: 20,
			//light green to golden tones
			tint: [0x00ff00, 0x32cd32, 0x3cb371, 0x2e8b57, 0x228b22, 0x556b2f, 0x6b8e23, 0x8b4513, 0xcd853f, 0xdaa520, 0xffd700],
			lifespan: {
				min: 800,
				max: 1200
			},
			alpha: { start: 1, end: 0 },
			scale: { start: 0.03, end: 0 },
			blendMode: 'ADD',
			quantity: 5,
			frequency: 10,
		});

	particles.stop();

	particles.startFollow(follower);

	follower.startFollow({
		rotateToPath: true,
		duration,
		positionOnPath: true,
		ease: 'Linear',
	});

	await delay(scene, 100);
	particles.start();

	await (delay(scene, duration));

	particles.stop();

	await (delay(scene, duration));

	particles.destroy();
	follower.destroy();

}
