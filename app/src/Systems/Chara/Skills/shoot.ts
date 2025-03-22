import { getJob } from "../../../Models/Job";
import { getSkill, SHOOT } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";
import { shootAnimation } from "../Animations/shootAnimation";
import { approach } from "../approach";

export function shoot(scene: BattlegroundScene) {

	return async (unit: Unit) => {

		const skill = getSkill(SHOOT)

		const enemies = await approach(UnitManager.getChara(unit.id), skill.range, true);

		if (!enemies) return;

		//unit with lower hp
		const [target] = enemies.sort((a, b) => a.hp - b.hp);

		await shootAnimation(scene, unit, target);
	};
}
