import { getBattleUnit } from "../../../Models/State";
import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { physicalAttack } from "./physicalAttack";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";
import { Chara } from "../Chara";
import { tween } from "../../../Utils/animation";
import { getMeleeTarget } from "../../../Models/Board";

export async function slash(
	scene: BattlegroundScene,
	unit: Unit,
) {
	const activeChara = UnitManager.getChara(unit.id);
	if (!activeChara) return;

	const target = getMeleeTarget(scene.state, unit);
	if (!target) {
		console.warn("No target found for slash");
		return;
	}
	const targetUnit = getBattleUnit(scene.state)(target.id);
	const targetChara = UnitManager.getChara(targetUnit.id);

	if (!targetChara) return;

	await attack(activeChara, targetChara);

	// return to the original position
	const position = UnitManager.getCharaPosition(unit);
	await tween({
		targets: [activeChara],
		...position,
		duration: 100,
	});
}


async function attack(activeChara: Chara, targetChara: Chara) {

	const distanceX = targetChara.x - activeChara.x;
	const distanceY = targetChara.y - activeChara.y;

	const lungeDistanceX = distanceX * 0.2;
	const lungeDistanceY = distanceY * 0.2;

	await tween({
		targets: [activeChara],
		x: activeChara.x + lungeDistanceX,
		y: activeChara.y + lungeDistanceY,
		duration: 100,
	});

	await physicalAttack(activeChara, targetChara);
}
