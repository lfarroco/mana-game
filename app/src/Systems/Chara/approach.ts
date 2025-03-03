import { snakeDistanceBetween, Vec2 } from "../../Models/Geometry";
import { getJob } from "../../Models/Job";
import { Unit } from "../../Models/Unit";
import { getUnitsByProximity, walk } from "../../Scenes/Battleground/ProcessTick";
import { lookupAIPAth } from "../../Scenes/Battleground/Systems/Pathfinding";
import { Chara } from "./Chara";

/*
Approach the closest enemy
It will walk towards the closest unit (allied or enemy) until it
either reaches it or runs out of movement range
Returns the unit if it is within the specified range
*/
export async function approach(
	chara: Chara,
	range: number = 1,
	enemy: boolean = true
): Promise<Unit | null> {

	const { scene } = chara;
	const { state } = chara.scene;
	const { unit } = chara;

	const job = getJob(unit.job);

	const [closestUnit] = getUnitsByProximity(state, unit, enemy);

	if (!closestUnit) {
		console.warn("No unit found");
		return null;
	};

	const distance = snakeDistanceBetween(unit.position)(closestUnit.position);

	if (distance <= range) return closestUnit;

	const pathTo = await lookupAIPAth(scene, unit.id, unit.position, closestUnit.position, job.moveRange);

	await walk(scene, unit, pathTo, (position: Vec2) => {
		const distance = snakeDistanceBetween(position)(closestUnit.position);
		return distance <= range;
	});

	const finalDistance = snakeDistanceBetween(unit.position)(closestUnit.position);

	if (finalDistance <= range)
		return closestUnit;
	else
		return null;

}