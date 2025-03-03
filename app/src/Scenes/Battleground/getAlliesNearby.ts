import { distanceBetween } from "../../Models/Geometry";
import { Unit } from "../../Models/Unit";
import { getState } from "../../Models/State";
import { getJob } from "../../Models/Job";
import { getSkill } from "../../Models/Skill";

export function getAllieNearby(unit: Unit) {
	const job = getJob(unit.job);
	const skill = getSkill(job.skill);

	return getState().gameData.units
		.filter((u) => u.force === unit.force)
		.filter((u) => {

			const distance = distanceBetween(u.position)(unit.position);

			return distance <= skill.range;

		});
}
