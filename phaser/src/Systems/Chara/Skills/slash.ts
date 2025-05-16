import { getBattleUnit } from "../../../Models/State";
import { Unit } from "../../../Models/Unit";
import { bashPieceAnimation } from "../Animations/bashPieceAnimation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { physicalAttack } from "./physicalAttack";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";
import { Chara } from "../Chara";
import { HALF_TILE_WIDTH, TILE_WIDTH } from "../../../Scenes/Battleground/constants";
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
	await tween({
		targets: [activeChara.container],
		x: activeChara.unit.position.x * TILE_WIDTH + HALF_TILE_WIDTH,
		Y: activeChara.unit.position.y * TILE_WIDTH + HALF_TILE_WIDTH,
		duration: 100,
	})
}


async function attack(activeChara: Chara, targetChara: Chara) {

	// TODO: bash piece animation gets out of sync with the physical attack logic.
	// should make it accept the physical attack function as a callback
	// currently, one's tweens interferes with the other

	await bashPieceAnimation(activeChara, targetChara.container);

	await physicalAttack(activeChara, targetChara);
}
