import { snakeDistanceBetween, Vec2 } from "../../../Models/Geometry";
import { getJob } from "../../../Models/Job";
import { getSkill } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { walk } from "../../../Scenes/Battleground/ProcessTick";
import { getUnitsByProximity } from "../../../Models/State";
import { lookupAIPAth as lookupPath } from "../../../Scenes/Battleground/Systems/Pathfinding";
import { popText } from "../Animations/popText";
import { emit, signals } from "../../../Models/Signals";
import { fireballEffect } from "../../../Effects/fireballEffect";

export const fireball = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const { state } = scene;

	const job = getJob(unit.job);

	const skill = getSkill('fireball');

	const [target] = getUnitsByProximity(state, unit, true);

	if (!target) {
		console.warn("No enemy found");
		return;
	};

	const unitChara = scene.getChara(unit.id);
	const targetChara = scene.getChara(target.id);

	const isInRange = () => snakeDistanceBetween(unit.position)(target.position) <= skill.range;

	if (!isInRange()) {

		const pathTo = await lookupPath(scene, unit.id, unit.position, target.position, job.moveRange);

		await walk(scene, unit, pathTo, (_position: Vec2) => {
			return isInRange()
		});

	}

	if (!isInRange()) return;

	popText(scene, skill.name, unit.id);

	await fireballEffect(scene, state.options.speed, unitChara.container, targetChara.container);

	popText(scene, unitChara.unit.attack.toString(), targetChara.unit.id);
	emit(signals.DAMAGE_UNIT, targetChara.id, unitChara.unit.attack);

}


