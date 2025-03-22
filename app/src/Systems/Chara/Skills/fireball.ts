import { FIREBALL, getSkill } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getUnitsByProximity } from "../../../Models/State";
import { popText } from "../Animations/popText";
import { emit, signals } from "../../../Models/Signals";
import { fireballEffect } from "../../../Effects/fireballEffect";
import { approach } from "../approach";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";

export const fireball = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const { state } = scene;

	const skill = getSkill(FIREBALL);
	const activeChara = UnitManager.getChara(unit.id);

	const candidates = await approach(activeChara, skill.range, true);

	if (!candidates) return;

	const [target] = candidates;

	const targetChara = UnitManager.getChara(target.id);

	popText(scene, skill.name, unit.id);

	await fireballEffect(scene, state.options.speed, activeChara.container, targetChara.container);

	// pick enemies in the cell and around the cell
	const targets = getUnitsByProximity(state, target, false, 2)

	// deal damage to all targets

	emit(signals.DAMAGE_UNIT, target.id, skill.power);
	popText(scene, skill.power.toString(), target.id);

	targets.forEach(target => {
		emit(signals.DAMAGE_UNIT, target.id, skill.power / 2);
		popText(scene, (skill.power / 2).toString(), target.id);
	});

}


