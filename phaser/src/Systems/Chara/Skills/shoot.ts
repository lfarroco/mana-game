import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";
import { shootAnimation } from "../Animations/shootAnimation";
import { approach } from "../approach";

export function shoot(scene: BattlegroundScene) {

	return async (unit: Unit) => {

		const activeChara = UnitManager.getChara(unit.id)
		if (!activeChara) return;

		const target = await approach(activeChara);

		shootAnimation(scene, unit, target);
	};
}
