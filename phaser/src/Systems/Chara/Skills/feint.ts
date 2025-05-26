import { Unit, unitLog } from "../../../Models/Unit";
import { popText } from "../Animations/popText";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { summonEffect } from "../../../Effects/summonEffect";
import { asVec2 } from "../../../Models/Geometry";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";

export async function feint(
	scene: BattlegroundScene,
	unit: Unit,
) {

	await popText({ text: "Feint", targetId: unit.id });

	const activeChara = UnitManager.getChara(unit.id);

	if (!activeChara) { throw new Error("no active unit\n" + unit.id); }

	unitLog(unit, `will cast feint on myself`);

	summonEffect(scene, asVec2(activeChara.container));

	// TODO: do something


}
