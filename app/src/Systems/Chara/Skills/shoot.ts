import { distanceBetween } from "../../../Models/Geometry";
import { getJob } from "../../../Models/Job";
import { getSkill } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getUnitsByProximity, shootAt, walk } from "../../../Scenes/Battleground/ProcessTick";
import { lookupAIPAth } from "../../../Scenes/Battleground/Systems/Pathfinding";

export function shoot(scene: BattlegroundScene) {

	return async (unit: Unit) => {

		const job = getJob(unit.job);

		const attackRange = getSkill(job.skill).range;

		const { state } = scene;

		const [closestEnemy] = getUnitsByProximity(state, unit, true);

		if (!closestEnemy) {
			return;
		};

		const distance = distanceBetween(unit.position)(closestEnemy.position);

		if (distance <= attackRange) {

			await shootAt(scene, unit, closestEnemy);
			return;

		}

		const pathTo = await lookupAIPAth(scene, unit.id, unit.position, closestEnemy.position, job.moveRange);

		const rangeDifference = distance - (attackRange + job.moveRange);

		if (rangeDifference < 0) {
			const path_ = pathTo.slice(0, pathTo.length + rangeDifference);
			// TODO: add per-step distance check to interrupt the walking
			await walk(scene, unit, path_);
		} else {
			await walk(scene, unit, pathTo);
		}

		if (distanceBetween(unit.position)(closestEnemy.position) <= attackRange) {
			await shootAt(scene, unit, closestEnemy);
		}

	};
}
