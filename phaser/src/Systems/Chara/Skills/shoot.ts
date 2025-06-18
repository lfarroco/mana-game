import { getUnitsByProximity } from "../../../Models/Board";
import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { shootAnimation } from "../Animations/shootAnimation";

export function shoot(scene: BattlegroundScene) {

	return async (unit: Unit) => {

		const [target] = getUnitsByProximity(scene.state, unit, true, Infinity);
		if (!target) return;

		shootAnimation(scene, unit, target);
	};
}
