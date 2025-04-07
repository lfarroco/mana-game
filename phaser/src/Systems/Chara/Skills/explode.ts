import { EXPLODE, getSkill } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getUnitsByProximity } from "../../../Models/State";
import { popText } from "../Animations/popText";
import { emit, signals } from "../../../Models/Signals";
import { approach } from "../approach";
import { delay } from "../../../Utils/animation";
import { explodeEffect } from "../../../Effects";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";

export const explode = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const { state } = scene;

	const skill = getSkill(EXPLODE);
	const activeChara = UnitManager.getChara(unit.id);

	const target = await approach(activeChara, skill.range, true);

	if (!target) return;

	popText({ text: skill.name, targetId: unit.id });

	await explodeEffect(scene, state.options.speed, activeChara.container);

	// pick enemies in the cell and around the caster
	const enemies = getUnitsByProximity(state, unit, true, 2)
	const allies = getUnitsByProximity(state, unit, false, 2)

	// deal damage to all targets and self

	emit(signals.DAMAGE_UNIT, unit.id, 999);

	[...enemies, ...allies].forEach(target => {
		emit(signals.DAMAGE_UNIT, target.id, skill.power / 2);
		popText({ text: (skill.power / 2).toString(), targetId: target.id });
	});

	await delay(scene, 500 / state.options.speed);
}


