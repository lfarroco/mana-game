import { distanceBetween } from "../../Models/Geometry";
import { UNIT_STATUS_KEYS, Unit } from "../../Models/Unit";
import { getState } from "../../Models/State";
import { getJob } from "../../Models/Job";

export function getEnemiesNearby(unit: Unit) {
	const job = getJob(unit.job);

	return getState().gameData.units
		.filter((u) => u.force !== unit.force)
		.filter((u) => u.status.type !== UNIT_STATUS_KEYS.DESTROYED)
		.filter((u) => {

			const distance = distanceBetween(u.position)(unit.position);

			return distance <= job.attackRange;

		});
}
