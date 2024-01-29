import { distanceBetween } from "../../Models/Geometry";
import { UNIT_STATUS_KEYS, Unit } from "../../Models/Unit";
import { getState } from "../../Models/State";
import { getJob } from "../../Models/Job";

export function getEnemiesNearby(squad: Unit) {
	const job = getJob(squad.job);
	const range = job.attackType === "melee" ? 1 : 3;

	return getState().gameData.squads
		.filter((sqd) => sqd.force !== squad.force)
		.filter((sqd) => sqd.status.type !== UNIT_STATUS_KEYS.DESTROYED)
		.filter((sqd) => {

			const distance = distanceBetween(sqd.position)(squad.position);

			return distance <= range;

		});
}
