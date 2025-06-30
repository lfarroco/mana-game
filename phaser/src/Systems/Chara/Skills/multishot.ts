import { getState } from "../../../Models/State";
import { Unit } from "../../../Models/Entities/Unit";
import { shootAnimation } from "../Animations/shootAnimation";
import { Chara } from "../Chara";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getUnitsByProximity } from "../../../Models/Board";
import { delay } from "../../../Utils/animation";
import { devlog } from "../../../utils";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";

export async function multishot(
	unit: Unit,
	activeChara: Chara,
	scene: BattlegroundScene,
) {
	devlog("[skill] :: multishot :: start");

	const enemyUnits = getUnitsByProximity(getState(), unit, true, 5);

	const targets = enemyUnits.slice(0, 4);

	const chara = UnitManager.getChara(unit.id);
	if (!chara) return;

	const [target] = getUnitsByProximity(scene.state, unit, true, Infinity);
	if (!target) return;

	activeChara.showPopText("Multishot");

	targets.forEach(async (target, i) => {

		await delay(scene, (i * 200));
		shootAnimation(scene, unit, target);
	});

	await delay(scene, 450 + ((targets.length * 200)));

	devlog("[skill] :: multishot :: end");

}
