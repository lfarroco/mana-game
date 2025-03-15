import { emit, signals } from "../../../Models/Signals";
import { Unit } from "../../../Models/Unit";
import { popText } from "./popText";
import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { impactEffect } from "../../../Effects";
import { getJob } from "../../../Models/Job";

export async function shootAnimation(scene: BattlegroundScene, unit: Unit, target: Unit) {

	const activeChara = scene.getChara(unit.id);
	const targetChara = scene.getChara(target.id);
	const job = getJob(unit.job);

	await popText(scene, "Shoot", unit.id);

	const arrow = scene.add.image(activeChara.container.x, activeChara.container.y, "arrow");

	arrow.setScale(0.15);

	const angle = Phaser.Math.Angle.Between(
		activeChara.container.x, activeChara.container.y,
		targetChara.container.x, targetChara.container.y
	);
	arrow.setRotation(angle);

	await tween({
		targets: [arrow],
		x: targetChara.container.x,
		y: targetChara.container.y,
		duration: 200 / scene.state.options.speed,
	});

	popText(scene, job.attack.toString(), target.id);
	arrow.destroy();
	emit(
		signals.DAMAGE_UNIT,
		targetChara.id,
		job.attack
	);

	await impactEffect({
		scene,
		location: targetChara.container,
		pointA: activeChara.container,
		pointB: targetChara.container,
		speed: scene.state.options.speed,
	})

}
