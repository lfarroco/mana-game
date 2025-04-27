import { EXPLODE, getSkill } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getColumnNeighbors } from "../../../Models/Board";
import { popText } from "../Animations/popText";
import { approach } from "../approach";
import { delay } from "../../../Utils/animation";
import { explodeEffect } from "../../../Effects";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";
import { damageUnit, killUnit } from "../Chara";

export const explode = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const { state } = scene;

	const skill = getSkill(EXPLODE);
	const activeChara = UnitManager.getChara(unit.id);

	const target = await approach(activeChara);

	await popText({ text: skill.name, targetId: unit.id });

	await explodeEffect(scene, state.options.speed, activeChara.container);

	const enemies = getColumnNeighbors(scene.state, target);

	await Promise.all([
		killUnit(activeChara),
		damageUnit(target.id, skill.power)
	]);

	for (const enemy of enemies)
		await damageUnit(enemy.id, skill.power / 2);

	await delay(scene, 500 / state.options.speed);
}


