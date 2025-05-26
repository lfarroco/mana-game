import { ARCANE_MISSILES, getSkill } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getRangedTargets } from "../../../Models/Board";
import * as animation from "../../../Effects/arcaneMissile";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";
import { damageUnit } from "../Chara";

export const arcaneMissiles = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const { state } = scene;
	const skill = getSkill(ARCANE_MISSILES);

	const targets = getRangedTargets(state, unit, 3);

	if (targets.length === 0) {
		console.warn("No enemies found");
		return;
	};

	const activeChara = UnitManager.getChara(unit.id);

	//pick 3 random indexes (can be repeated)
	new Array(3)
		.map(() => Math.floor(Math.random() * targets.length))
		.forEach((index) => {

			const target = targets[index];

			const targetChara = UnitManager.getChara(target.id);

			animation.arcaneMissile(
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


