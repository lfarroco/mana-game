import { ARCANE_MISSILES, getSkill } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getRangedTargets } from "../../../Models/Board";
import * as animation from "../../../Effects/arcaneMissile";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";
import { damageUnit } from "../Chara";
import { TraitData } from "../../../Models/Traits";

export const arcaneMissiles = (
	scene: BattlegroundScene
) => async (unit: Unit, traitData: TraitData) => {

	let projectiles = 3;

	if (traitData?.projectiles)
		projectiles = traitData.projectiles;

	const { state } = scene;
	const skill = getSkill(ARCANE_MISSILES);

	const targets = getRangedTargets(state, unit, 3);

	if (targets.length === 0) {
		console.warn("No enemies found");
		return;
	};

	const activeChara = UnitManager.getChara(unit.id);

	//pick 3 random indexes (can be repeated)
	for (let i = 1; i <= projectiles; i++) {

		const randomIndex = Math.floor(Math.random() * targets.length);

		const target = targets[randomIndex];

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

	}


}


