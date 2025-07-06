import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getUnitsByProximity } from "../../../Models/Board";
import { fireballEffect } from "../../../Effects/fireballEffect";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";
import { asVec2 } from "../../../Models/Geometry";

export const fireball = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const { state } = scene;

	const activeChara = UnitManager.getChara(unit.id);
	if (!activeChara) {
		console.warn(`[fireball] Active Chara not found for unit ID: ${unit.id}`);
		return;
	}

	const [targetUnit] = getUnitsByProximity(state, unit, true, Infinity);
	if (!targetUnit) return;

	const targetChara = UnitManager.getChara(targetUnit.id);
	if (!targetChara) {
		console.warn(`[fireball] Target Chara not found for target Unit ID: ${targetUnit.id}`);
		return;
	}

	await fireballEffect(scene, asVec2(activeChara), asVec2(targetChara));

	// pick enemies in the cell and around the cell
	//const splashTargets = getUnitsByProximity(state, targetUnit, true, 2);

	// deal damage to all targets
	//targetChara.unitHit(unit.power);
	// splashTargets.forEach(splashAffectedUnit => {
	// 	UnitManager.getChara(splashAffectedUnit.id)?.unitHit(unit.power / 2);
	// });
}
