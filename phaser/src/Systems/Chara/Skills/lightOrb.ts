import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import * as glowingOrb from "../../../Effects/GlowingOrb";
import { delay } from "../../../Utils/animation";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";
import { getUnitsByProximity } from "../../../Models/Board";

export const lightOrb = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	//const damage = Math.floor(unit.power / 2);

	const activeChara = UnitManager.getChara(unit.id);
	if (!activeChara) return;

	const [target] = getUnitsByProximity(scene.state, unit, true, Infinity);
	if (!target) return;

	const targetChara = UnitManager.getChara(target.id);
	if (!targetChara) return;

	const orb = glowingOrb.create(
		scene,
		activeChara.x, activeChara.y,
		targetChara,
		500
	).setScale(0.5);

	await delay(scene, 500);

	//await targetChara.unitHit(damage);

	await delay(scene, 1000);

	orb.destroy();
}
