import { sumVec2, vec2 } from "../../Models/Geometry";
import { Unit } from "../../Models/Unit";
import { getState, getUnitsByProximity } from "../../Models/State";
import { Chara } from "./Chara";
import { FORCE_ID_PLAYER } from "../../Models/Force";
import { tween } from "../../Utils/animation";

// TODO: return all enemies in range
export async function approach(
	chara: Chara,
): Promise<Unit> {

	const { unit } = chara;
	const state = getState();

	// try approaching the closest enemy
	const enemies = getUnitsByProximity(state, unit, true, Infinity);
	const [closestEnemy] = enemies;

	// cpu moves ->
	//player moves <-
	const modifier = chara.unit.force === FORCE_ID_PLAYER ? -1 : 1;

	// move to the tile in front of the enemy
	const targetTile = sumVec2(closestEnemy.position)(vec2(modifier, 0));

	await tween({
		targets: [chara.container],
		to: targetTile,
		duration: 500 / state.options.speed,
	})

	return closestEnemy;

}