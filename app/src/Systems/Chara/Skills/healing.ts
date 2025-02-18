import { distanceBetween, sortByDistanceTo } from "../../../Models/Geometry";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getUnitsByProximity, walk } from "../../../Scenes/Battleground/ProcessTick";
import { healAnimation } from "../Animations/healAnimation";
import { lookupAIPAth } from "../../../Scenes/Battleground/Systems/Pathfinding";

export const healing = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const allies = getUnitsByProximity(scene.state, unit, false);
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
		.filter((a) => distanceBetween(a.position)(unit.position) <= 3);


	if (hurtAndClose) {
		await healAnimation(scene, unit, hurtAndClose);
		return;
	}

	const [closerHurt] = hurtAllies.sort((a, b) => sortByDistanceTo(unit.position)(a.position)(b.position));

	if (closerHurt) {
		const path = await lookupAIPAth(scene, unit.id, unit.position, closerHurt.position);

		//remove 3 last tiles from the path
		const path_ = path.slice(0, path.length - 3);

		await walk(scene, unit, path_);

		if (path_.length < 1) {
			await healAnimation(scene, unit, closerHurt);
		}

	}

};
