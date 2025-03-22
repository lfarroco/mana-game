import { Unit } from "../../../Models/Unit";
import { popText } from "./popText";
import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { physicalAttack } from "../Skills/physicalAttack";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";

export async function shootAnimation(scene: BattlegroundScene, unit: Unit, target: Unit) {

	const activeChara = UnitManager.getChara(unit.id);
	const targetChara = UnitManager.getChara(target.id);

	await popText(scene, "Shoot", unit.id);

	const arrow = scene.add.image(activeChara.container.x, activeChara.container.y, "arrow");

	arrow.setScale(0.3);

	const angle = Phaser.Math.Angle.Between(
		activeChara.container.x, activeChara.container.y,
		targetChara.container.x, targetChara.container.y
	);
	arrow.setRotation(angle);

	await tween({
		targets: [arrow],
		x: targetChara.container.x,
		y: targetChara.container.y,
		duration: 200 / scene.speed,
	});

	arrow.destroy();

	await physicalAttack(activeChara, targetChara);
}
