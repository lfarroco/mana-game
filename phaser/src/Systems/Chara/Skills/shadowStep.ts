import { summonEffect } from "../../../Effects";
import { eqVec2, sumVec2, vec2 } from "../../../Models/Geometry";
import { Skill } from "../../../Models/Skill";
import { getUnitsByProximity } from "../../../Models/Board";
import { Unit } from "../../../Models/Unit";
import { specialAnimation } from "../Animations/specialAnimation";
import { Chara } from "../Chara";
import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { slash } from "./slash";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../../Scenes/Battleground/constants";

const coords = [1, 0, -1]
	.map(x => [0, 1, -1]
		.map(y => vec2(x, y))
	)
	.flatMap(x => x);

export async function shadowStep(
	scene: BattlegroundScene,
	unit: Unit,
	activeChara: Chara,
	_skill: Skill,
) {
	const enemies = getUnitsByProximity(scene.state, unit, true, 2);

	if (enemies.length > 0)
		return false;

	await specialAnimation(activeChara);

	const candidates = getUnitsByProximity(scene.state, unit, true, Infinity).reverse();

	const cell = planShadowStep(scene, candidates);

	if (!cell) return false;

	unit.position = cell;
	activeChara.container.visible = false;
	await summonEffect(scene, activeChara.container);
	await tween({
		targets: [activeChara.container],
		x: cell.x * TILE_WIDTH + HALF_TILE_WIDTH,
		y: cell.y * TILE_HEIGHT + HALF_TILE_HEIGHT,
		duration: 100
	});
	activeChara.container.visible = true;

	await summonEffect(scene, activeChara.container);

	await slash(scene, unit);

	return true;
}

function planShadowStep(
	scene: BattlegroundScene,
	candidates: Unit[],
) {
	for (const target of candidates) {
		//get empty cell around
		const cells = coords
			.filter(cell => Math.abs(cell.x) + Math.abs(cell.y))
			.map(vec => sumVec2(target.position)(vec))
			.filter(cell => {
				return !scene.state.battleData.units.find(unit => eqVec2(unit.position, cell));
			});

		const [cell] = cells;

		return cell
	}
	return null;
}