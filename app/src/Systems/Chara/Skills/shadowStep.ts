import { summonEffect } from "../../../Effects";
import { eqVec2, sumVec2, vec2 } from "../../../Models/Geometry";
import { Skill } from "../../../Models/Skill";
import { getUnitsByProximity } from "../../../Models/State";
import { Unit } from "../../../Models/Unit";
import { specialAnimation } from "../Animations/specialAnimation";
import { Chara } from "../Chara";
import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { slash } from "./slash";

const coords = [1, 0, -1]
	.map(x => [0, 1, -1]
		.map(y => vec2(x, y))
	)
	.flatMap(x => x);

export async function shadowStep(
	scene: BattlegroundScene,
	unit: Unit,
	activeChara: Chara,
	skill: Skill,
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
		x: cell.x * 64 + 32,
		y: cell.y * 64 + 32,
		duration: 100 / scene.state.options.speed
	});
	activeChara.container.visible = true;

	await summonEffect(scene, activeChara.container);

	unit.cooldowns[skill.id] = skill.cooldown;

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
				return !scene.state.gameData.units.find(unit => eqVec2(unit.position, cell));
			});

		const [cell] = cells;

		return cell
	}
	return null;
}