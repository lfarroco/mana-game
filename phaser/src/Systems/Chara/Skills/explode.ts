import { EXPLODE, getSkill } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getColumnNeighbors } from "../../../Models/Board";
import { popText } from "../Animations/popText";
import { approach } from "../approach";
import { delay } from "../../../Utils/animation";
import { explodeEffect } from "../../../Effects";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";

export const explode = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	console.log("explode:: unit", unit);

	const { state } = scene;

	const skill = getSkill(EXPLODE);
	const activeChara = UnitManager.getChara(unit.id);

	const target = await approach(activeChara);

	await popText({ text: skill.name, targetId: unit.id });

	await explodeEffect(scene, state.options.speed, activeChara);

	const enemies = getColumnNeighbors(scene.state, target);

	await Promise.all([
		activeChara.killUnit(),
		UnitManager.getChara(target.id).damageUnit(skill.power)
	]);

	for (const enemy of enemies)
		await UnitManager.getChara(enemy.id).damageUnit(skill.power / 2);

	await delay(scene, 500);
}


