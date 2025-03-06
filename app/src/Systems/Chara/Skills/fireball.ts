import { snakeDistanceBetween, Vec2 } from "../../../Models/Geometry";
import { getJob } from "../../../Models/Job";
import { getSkill } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { walk } from "../../../Scenes/Battleground/ProcessTick";
import { getUnitsByProximity } from "../../../Models/State";
import { lookupAIPAth } from "../../../Scenes/Battleground/Systems/Pathfinding";
import { fireballAnimation } from "../Animations/fireballAnimation";

export function fireball(scene: BattlegroundScene) {

	return async (unit: Unit) => {

		const job = getJob(unit.job);

		const attackRange = getSkill(job.baseAttack).range;

		const { state } = scene;

		const [closestEnemy] = getUnitsByProximity(state, unit, true);

		if (!closestEnemy) {
			console.warn("No enemy found");
			return;
		};

		const distance = snakeDistanceBetween(unit.position)(closestEnemy.position);

		if (distance > attackRange) {

			const pathTo = await lookupAIPAth(scene, unit.id, unit.position, closestEnemy.position, job.moveRange);

			await walk(scene, unit, pathTo, (position: Vec2) => {
				const distance = snakeDistanceBetween(position)(closestEnemy.position);
				return distance <= attackRange;
			});

		}

		if (snakeDistanceBetween(unit.position)(closestEnemy.position) <= attackRange) {
			await fireballAnimation(scene, unit, closestEnemy);
		}

	};
}
