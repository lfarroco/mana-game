import { FIREBALL, getSkill } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getUnitsByProximity } from "../../../Models/Board";
import { popText } from "../Animations/popText";
import { fireballEffect } from "../../../Effects/fireballEffect";
import { approach } from "../approach";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";

export const fireball = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const { state } = scene;

	const skill = getSkill(FIREBALL);
	const activeChara = UnitManager.getChara(unit.id);

	const target = await approach(activeChara);

	const targetChara = UnitManager.getChara(target.id);

	popText({ text: skill.name, targetId: unit.id });

	await fireballEffect(scene, state.options.speed, activeChara, targetChara);

	// pick enemies in the cell and around the cell
	const targets = getUnitsByProximity(state, target, false, 2)

	// deal damage to all targets

	targetChara.damageUnit(skill.power);

	targets.forEach(target => {
		UnitManager.getChara(target.id).damageUnit(skill.power / 2);
		popText({ text: (skill.power / 2).toString(), targetId: target.id });
	});

}


