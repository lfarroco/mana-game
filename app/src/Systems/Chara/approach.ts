import { snakeDistanceBetween, Vec2 } from "../../Models/Geometry";
import { getJob } from "../../Models/Job";
import { Unit } from "../../Models/Unit";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { getUnitsByProximity, walk } from "../../Scenes/Battleground/ProcessTick";
import { lookupAIPAth } from "../../Scenes/Battleground/Systems/Pathfinding";

/*
Approach the closest enemy
It will walk towards the closest unit (allied or enemy) until it
either reaches it or runs out of movement range
Returns the unit if it is within the specified range
*/
export async function approach(
	scene: BattlegroundScene,
	unit: Unit,
	range: number = 1,
	enemy: boolean = true
): Promise<Unit | null> {

	const chara = scene.getChara(unit.id);
	const { state } = chara.scene;

	const job = getJob(unit.job);

	const [closestUnit] = getUnitsByProximity(state, unit, enemy);

	if (!closestUnit) {
		return null;
	}

	const distance = snakeDistanceBetween(unit.position)(closestUnit.position);

	if (distance <= range) return closestUnit;

	const pathTo = await lookupAIPAth(scene, unit.id, unit.position, closestUnit.position, job.moveRange);

	await walk(scene, unit, pathTo, (position: Vec2) => {
		const distance = snakeDistanceBetween(position)(closestUnit.position);
		console.log("walking to enemy", distance)
		return distance <= range;
	});

	const finalDistance = snakeDistanceBetween(unit.position)(closestUnit.position);

	console.log("final range", finalDistance)

	if (finalDistance <= range)
		return closestUnit;
	else
		return null;

}