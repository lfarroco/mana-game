import Phaser from "phaser";
import { asVec2, Vec2 } from "../../../Models/Geometry";
import { delay } from "../../../Utils/animation";
import { Unit } from "../../../Models/Unit";
import { getUnitsByProximity } from "../../../Scenes/Battleground/ProcessTick";
import { emit, signals } from "../../../Models/Signals";
import { BattlegroundScene } from "../../../Scenes/Battleground/BattlegroundScene";

// TODO: make this the acolyte's skill

export async function healingWave(scene: BattlegroundScene, unit: Unit) {

	const allies = getUnitsByProximity(scene.state, unit, false);

	const hurtAllies = allies
		.filter(u => u.hp < u.maxHp)
		.map(unit => {
			const percentage = unit.hp / unit.maxHp;
			return {
				unit,
				percentage
			}
		})
		.sort((a, b) => b.percentage - a.percentage)
		.map(({ unit }) => unit);


	const top3 = hurtAllies.slice(0, 3);

	top3.forEach(ally => {
		emit(signals.HEAL_UNIT, ally.id, 50);
	});

	const charas = [scene.getChara(unit.id)].concat(top3.map(u => scene.getChara(u.id)))

	await animation(scene, charas.map(c => asVec2(c.container)));

}


export async function animation(scene: BattlegroundScene, targets: Vec2[]) {
	const duration = 300;
	const lifespan = 1000;

	const keypoints = targets.flatMap(target => [target.x, target.y]);

	const curve = new Phaser.Curves.Spline(keypoints);

	const path = new Phaser.Curves.Path().add(curve);

	const follower = scene.add.follower(path, targets[0].x, targets[0].y, '');
	follower.setVisible(false);

	const particles = scene.add.particles(0, 0,
		'white-dot',
		{
			speed: 50,
			//light green to golden tones
			tint: [0x00ff00, 0x32cd32, 0x3cb371, 0x2e8b57, 0x228b22, 0x556b2f, 0x6b8e23, 0x8b4513, 0xcd853f, 0xdaa520, 0xffd700],
			lifespan: lifespan,
			alpha: { start: 1, end: 0 },
			scale: { start: 1, end: 0 },
			radial: true,
			blendMode: 'ADD',
			quantity: 5,
			frequency: 0,
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

	await (delay(scene, lifespan));

	particles.destroy();
	follower.destroy();

}
