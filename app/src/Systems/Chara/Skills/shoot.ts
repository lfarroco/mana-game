import { snakeDistanceBetween, Vec2 } from "../../../Models/Geometry";
import { getJob } from "../../../Models/Job";
import { getSkill, SHOOT } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { walk } from "../../../Scenes/Battleground/ProcessTick";
import { shootAnimation } from "../Animations/shootAnimation";
import { lookupAIPAth } from "../../../Scenes/Battleground/Systems/Pathfinding";
import { approach } from "../approach";

export function shoot(scene: BattlegroundScene) {

	return async (unit: Unit) => {

		const job = getJob(unit.job);

		const skill = getSkill(SHOOT)

		const closestEnemy = await approach(scene.getChara(unit.id), skill.range, true);

		if (!closestEnemy) {
			console.warn("No enemy found");
			return;
		};

		const distance = snakeDistanceBetween(unit.position)(closestEnemy.position);

		if (distance > skill.range) {

			const pathTo = await lookupAIPAth(scene, unit.id, unit.position, closestEnemy.position, job.moveRange);

			await walk(scene, unit, pathTo, (position: Vec2) => {
				const distance = snakeDistanceBetween(position)(closestEnemy.position);
				return distance <= skill.range;
			});

		}

		if (snakeDistanceBetween(unit.position)(closestEnemy.position) <= skill.range) {
			await shootAnimation(scene, unit, closestEnemy);
		}

	};
}
