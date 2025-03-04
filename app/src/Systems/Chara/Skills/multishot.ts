import { getState } from "../../../Models/State";
import { Unit } from "../../../Models/Unit";
import { popText } from "../Animations/popText";
import { shootAnimation } from "../Animations/shootAnimation";
import { Chara } from "../Chara";
import { runPromisesInOrder as sequenceAsync } from "../../../utils";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getUnitsByProximity } from "../../../Scenes/Battleground/ProcessTick";

export async function multishot(unit: Unit, activeChara: Chara, scene: BattlegroundScene) {
	const enemyUnits = getUnitsByProximity(getState(), unit, true);

	const targets = enemyUnits.slice(0, 4);

	popText(scene, "Multishot", activeChara.id);

	await sequenceAsync(targets.map(target => async () => {
		await shootAnimation(scene, unit, target);
	}));
}
