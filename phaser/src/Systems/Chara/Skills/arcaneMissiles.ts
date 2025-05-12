import { ARCANE_MISSILES, getSkill } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getUnitsByProximity } from "../../../Models/Board";
import * as animation from "../../../Effects/arcaneMissile";
import { approach } from "../approach";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";
import { damageUnit } from "../Chara";

export const arcaneMissiles = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const { state } = scene;
	const skill = getSkill(ARCANE_MISSILES);

	const closest = await approach(UnitManager.getChara(unit.id));

	if (!closest) return;

	const targets = getUnitsByProximity(state, unit, true, skill.range);

	if (targets.length === 0) {
		console.warn("No enemy found");
		return;
	};

	const activeChara = UnitManager.getChara(unit.id);

	//pick 3 random indexes (can be repeated)
	const targetIndexes = Array.from({ length: 3 }, () => Math.floor(Math.random() * targets.length));

	targetIndexes.forEach((index) => {

		const target = targets[index];

		const targetChara = UnitManager.getChara(target.id);

		animation.arcaneMissle(
			scene,
			activeChara.container,
			targetChara.container,
			state.options.speed,
			() => {

				if (targetChara.unit.hp <= 0) return;
				damageUnit(targetChara.id, skill.power)

			}

		);

	});


}


