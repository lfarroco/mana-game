import { emit, signals } from "../../../Models/Signals";
import { Unit } from "../../../Models/Unit";
import { popText } from "./popText";
import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";

export async function fireballAnimation(scene: BattlegroundScene, unit: Unit, target: Unit) {

	const unitChara = scene.getChara(unit.id);
	const targetChara = scene.getChara(target.id);

	popText(scene, "Fireball", unit.id);

	const angle = Phaser.Math.Angle.Between(
		unitChara.container.x, unitChara.container.y,
		targetChara.container.x, targetChara.container.y
	);

	const particles = scene.add.particles(
		unitChara.container.x,
		unitChara.container.y,
		'light',
		{
			speed: { min: 50, max: 150 },
			angle: { min: angle - 30, max: angle + 30 },
			//red, orange, yellow
			tint: [0xff0000, 0xffa500, 0xffff00],
			lifespan: 400,
			alpha: { start: 1, end: 0 },
			scale: { start: 1, end: 0 },
			//blendMode: 'ADD'
		}

	)

	await tween({
		targets: [particles],
		x: targetChara.container.x,
		y: targetChara.container.y,
		duration: 500 / scene.state.options.speed,
	});

	popText(scene, unit.attack.toString(), target.id);
	particles.destroy();
	emit(
		signals.DAMAGE_UNIT,
		targetChara.id,
		unit.attack
	);

}
