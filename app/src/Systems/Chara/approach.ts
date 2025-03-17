import { snakeDistanceBetween, Vec2 } from "../../Models/Geometry";
import { getJob } from "../../Models/Job";
import { Unit } from "../../Models/Unit";
import { walk } from "../../Scenes/Battleground/ProcessTick";
import { getUnitsByProximity } from "../../Models/State";
import { lookupAIPAth } from "../../Scenes/Battleground/Systems/Pathfinding";
import { Chara } from "./Chara";

/*
Approach the closest enemy
It will walk towards the closest unit (allied or enemy) until it
either reaches it or runs out of movement range
Returns the unit if it is within the specified range
*/
// TODO: return all enemies in range
export async function approach(
	chara: Chara,
	skillRange: number = 1,
	enemy: boolean = true
): Promise<Unit[] | null> {

	const { scene, unit } = chara;
	const { state } = chara.scene;

	const job = getJob(unit.job);

	// if there are units in range, return them
	const unitsInRange = getUnitsByProximity(state, unit, enemy, skillRange).concat(
		!enemy ? [chara.unit] : [] // include self if looking for allies
	);
	if (unitsInRange.length > 0) return unitsInRange;

	// try approaching the closest enemy
	const enemies = getUnitsByProximity(state, unit, enemy, Infinity);
	const [closestEnemy] = enemies;

	const pathTo = await lookupAIPAth(scene, unit.id, unit.position, closestEnemy.position, job.moveRange);

	await walk(scene, unit, pathTo, (position: Vec2) => {
		const distance = snakeDistanceBetween(position)(closestEnemy.position);
		return distance <= skillRange;
	});

	// return any enemies in range after moving
	const enemiesInRangeAfterMove = getUnitsByProximity(state, unit, enemy, skillRange);

	if (enemiesInRangeAfterMove.length)
		return enemiesInRangeAfterMove
	else
		return null;

}