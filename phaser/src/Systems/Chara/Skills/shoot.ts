import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";
import { shootAnimation } from "../Animations/shootAnimation";
import { approach } from "../approach";

export function shoot(scene: BattlegroundScene) {

	return async (unit: Unit) => {

		const target = await approach(UnitManager.getChara(unit.id));

		shootAnimation(scene, unit, target);
	};
}
