import { asVec2 } from "../../../Models/Geometry";
import { emit, signals } from "../../../Models/Signals";
import { getUnit } from "../../../Models/State";
import { Unit, unitLog } from "../../../Models/Unit";
import { bashPieceAnimation } from "../Animations/bashPieceAnimation";
import { popText } from "../Animations/popText";
import { slashAnimation } from "../Animations/slashAnimation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { panTo } from "../../../Scenes/Battleground/ProcessTick";

export async function slash(
	scene: BattlegroundScene,
	unit: Unit,
	target: Unit) {

	await popText(scene, "Slash", unit.id);

	const activeChara = scene.getChara(unit.id);

	const targetUnit = getUnit(scene.state)(target.id);

	const targetChara = scene.getChara(targetUnit.id);

	if (!activeChara) { throw new Error("no active unit\n" + unit.id); }

	panTo(scene, asVec2(activeChara.container));

	if (targetUnit.hp <= 0) {
		throw new Error("target is dead");
	}

	unitLog(unit, `will cast slash on ${targetUnit.id}`);

	bashPieceAnimation(activeChara, targetChara);

	await slashAnimation(scene, activeChara, targetChara, unit.attack);

	emit(
		signals.DAMAGE_UNIT,
		targetChara.id,
		10
	);

}
