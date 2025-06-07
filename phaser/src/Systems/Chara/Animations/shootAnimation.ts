import { Unit } from "../../../Models/Unit";
import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { physicalAttack } from "../Skills/physicalAttack";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";
import { images } from "../../../assets";

export async function shootAnimation(scene: BattlegroundScene, unit: Unit, target: Unit) {

	const activeChara = UnitManager.getChara(unit.id);
	const targetChara = UnitManager.getChara(target.id);

	const arrow = scene.add.image(
		activeChara.x, activeChara.y,
		images.arrow.key,
	);

	arrow.setScale(0.3);

	const angle = Phaser.Math.Angle.Between(
		activeChara.x, activeChara.y,
		targetChara.x, targetChara.y
	);
	arrow.setRotation(angle);

	await tween({
		targets: [arrow],
		x: targetChara.x,
		y: targetChara.y,
		duration: 200,
	});

	arrow.destroy();

	await physicalAttack(activeChara, targetChara);
}
