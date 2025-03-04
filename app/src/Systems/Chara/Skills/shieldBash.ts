import { emit, signals } from "../../../Models/Signals";
import { getUnit } from "../../../Models/State";
import { Unit, unitLog } from "../../../Models/Unit";
import { bashPieceAnimation } from "../Animations/bashPieceAnimation";
import { popText } from "../Animations/popText";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import * as animation from "../Animations/shieldBash"

export async function shieldBash(
	scene: BattlegroundScene,
	unit: Unit,
	target: Unit,
) {

	await popText(scene, "Shield Bash", unit.id);

	const activeChara = scene.getChara(unit.id);

	const targetUnit = getUnit(scene.state)(target.id);

	const targetChara = scene.getChara(targetUnit.id);

	if (!activeChara) { throw new Error("no active unit\n" + unit.id); }

	if (targetUnit.hp <= 0) {
		throw new Error("target is dead");
	}

	unitLog(unit, `will cast shield bash on ${targetUnit.id}`);

	bashPieceAnimation(activeChara, targetChara);

	await animation.shieldBash(activeChara, targetChara)

	emit(
		signals.DAMAGE_UNIT,
		targetChara.id,
		unit.attack
	);

	emit(
		signals.ADD_STATUS,
		targetChara.id,
		"stun",
		1
	);

}
