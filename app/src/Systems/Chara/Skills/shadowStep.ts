import { summonEffect } from "../../../Effects";
import { asVec2 } from "../../../Models/Geometry";
import { Skill } from "../../../Models/Skill";
import { getUnitsByProximity } from "../../../Models/State";
import { Unit } from "../../../Models/Unit";
import { specialAnimation } from "../Animations/specialAnimation";
import { Chara } from "../Chara";
import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";

export async function shadowStep(
	scene: BattlegroundScene,
	unit: Unit,
	activeChara: Chara,
	skill: Skill) {
	const enemies = getUnitsByProximity(scene.state, unit, true, 2);

	console.log(";:", enemies)

	if (enemies.length > 0)
		return false;

	await specialAnimation(activeChara);

	const [target] = getUnitsByProximity(scene.state, unit, true, Infinity).reverse();

	if (target) {
		//get cell behind target
		let cell = null;
		let x = 0;
		let y = 0;
		let counter = 0;

		while (!cell) {

			if (counter > 10) {
				break;
			}
			counter++;

			x = target.position.x + Math.floor(Math.random() * 3) - 1;
			y = target.position.y + Math.floor(Math.random() * 3) - 1;

			const occupier = scene.state.gameData.units.find(u => u.position.x === x && u.position.y === y);

			if (!occupier) {
				cell = { x, y };
			}

		}

		if (cell) {
			unit.position = asVec2(cell);
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
		}


	}

	unit.cooldowns[skill.id] = skill.cooldown;

	return true;
}
