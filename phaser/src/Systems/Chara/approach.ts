import { Unit } from "../../Models/Unit";
import { getState } from "../../Models/State";
import { getUnitsByProximity } from "../../Models/Board";
import { Chara } from "./Chara";

// TODO: return all enemies in range
export async function approach(
	chara: Chara,
): Promise<Unit> {

	const { unit } = chara;
	const state = getState();

	// try approaching the closest enemy
	const enemies = getUnitsByProximity(state, unit, true, Infinity);
	const [closestEnemy] = enemies;

	return closestEnemy;

}