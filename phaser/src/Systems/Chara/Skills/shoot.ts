import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";
import { shootAnimation } from "../Animations/shootAnimation";
import { approach } from "../approach";

export function shoot(scene: BattlegroundScene) {

	return async (unit: Unit) => {

		const target = await approach(UnitManager.getChara(unit.id));

		await shootAnimation(scene, unit, target);
	};
}
