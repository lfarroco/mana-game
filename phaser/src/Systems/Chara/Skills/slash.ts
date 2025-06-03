import { getBattleUnit } from "../../../Models/State";
import { Unit } from "../../../Models/Unit";
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

	const target = getMeleeTarget(scene.state, unit);
	if (!target) {
		console.warn("No target found for slash");
		return;
	}
	const targetUnit = getBattleUnit(scene.state)(target.id);
	const targetChara = UnitManager.getChara(targetUnit.id);

	await attack(activeChara, targetChara);

	// return to the original position
	const position = UnitManager.getCharaPosition(unit);
	await tween({
		targets: [activeChara.container],
		...position,
		duration: 100,
	});
}


async function attack(activeChara: Chara, targetChara: Chara) {

	// TODO: bash piece animation gets out of sync with the physical attack logic.
	// should make it accept the physical attack function as a callback
	// currently, one's tweens interferes with the other

	await physicalAttack(activeChara, targetChara);
}
