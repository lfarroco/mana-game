import { snakeDistanceBetween, sortBySnakeDistance } from "../../../Models/Geometry";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getUnitsByProximity } from "../../../Models/Board";
import { healAnimation } from "../Animations/healAnimation";

export const healing = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const allies = getUnitsByProximity(scene.state, unit, false, 5);
	const hurtAllies = allies
		.filter(u => u.hp < u.maxHp)
		.map(unit => {
			const percentage = unit.hp / unit.maxHp;
			return {
				unit,
				percentage
			}
		})
		.sort((a, b) => b.percentage - a.percentage)
		.map(({ unit }) => unit);

	const [hurtAndClose] = hurtAllies
		.filter((a) => snakeDistanceBetween(a.position)(unit.position) <= 3);

	if (hurtAndClose) {
		await healAnimation(scene, unit, hurtAndClose);
		return;
	}

	const [closerHurt] = hurtAllies.sort((a, b) => sortBySnakeDistance(unit.position)(a.position)(b.position));

	// TODO: use approach instead
	if (closerHurt) {

		await healAnimation(scene, unit, closerHurt);

	}

};
