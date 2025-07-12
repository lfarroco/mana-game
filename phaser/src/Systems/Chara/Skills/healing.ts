import { snakeDistanceBetween, sortBySnakeDistance } from "../../../Models/Geometry";
import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getUnitsByProximity } from "../../../Models/Board";
import { healAnimation } from "../Animations/healAnimation";

export const healing = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const allies = getUnitsByProximity(scene.state, unit, false, 5);
	// Since units no longer have HP, we'll just target all allies
	const targetAllies = allies
		.map(unit => {
			return {
				unit,
				percentage: 1 // No HP to calculate percentage, use full effectiveness
			}
		})
		.sort((a, b) => b.percentage - a.percentage);

	const hurtAndClose = targetAllies
		.find((a) => snakeDistanceBetween(a.unit.position)(unit.position) <= 3);

	if (hurtAndClose) {
		await healAnimation(scene, unit, hurtAndClose.unit);
		return;
	}

	const [closerHurt] = targetAllies
		.sort((a, b) => sortBySnakeDistance(unit.position)(a.unit.position)(b.unit.position));

	// TODO: use approach instead
	if (closerHurt) {
		await healAnimation(scene, unit, closerHurt.unit);
	}

};
