import { emit, signals } from "../../../Models/Signals";
import { Unit, unitLog } from "../../../Models/Unit";
import { popText } from "../Animations/popText";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { summonEffect } from "../../../Effects/summonEffect";
import { asVec2 } from "../../../Models/Geometry";

export async function feint(
	scene: BattlegroundScene,
	unit: Unit,
) {

	await popText(scene, "Feint", unit.id);

	const activeChara = scene.getChara(unit.id);

	if (!activeChara) { throw new Error("no active unit\n" + unit.id); }

	unitLog(unit, `will cast feint on myself`);

	summonEffect(scene, asVec2(activeChara.container));

	emit(
		signals.ADD_STATUS,
		activeChara.id,
		"next-critical",
		1
	);

	emit(
		signals.ADD_STATUS,
		activeChara.id,
		"next-dodge",
		1
	);

}
