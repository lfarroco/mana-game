import { emit, signals } from "../../../Models/Signals";
import { Unit } from "../../../Models/Unit";
import { popText } from "./popText";
import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";


export async function shootAnimation(scene: BattlegroundScene, unit: Unit, target: Unit) {

	const unitChara = scene.getChara(unit.id);
	const targetChara = scene.getChara(target.id);

	popText(scene, "Shoot", unit.id);

	const arrow = scene.add.image(unitChara.container.x, unitChara.container.y, "arrow");

	arrow.setScale(0.2);

	const angle = Phaser.Math.Angle.Between(
		unitChara.container.x, unitChara.container.y,
		targetChara.container.x, targetChara.container.y
	);
	arrow.setRotation(angle);

	await tween({
		targets: [arrow],
		x: targetChara.container.x,
		y: targetChara.container.y,
		duration: 500 / scene.state.options.speed,
	});

	popText(scene, "22", target.id);
	arrow.destroy();
	emit(
		signals.DAMAGE_UNIT,
		targetChara.id,
		22
	);

}
