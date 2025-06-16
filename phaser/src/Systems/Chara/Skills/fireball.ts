import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getUnitsByProximity } from "../../../Models/Board";
import { popText } from "../Animations/popText";
import { fireballEffect } from "../../../Effects/fireballEffect";
import { approach } from "../approach";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";
import { getOption } from "../../../Models/OptionsStore";

export const fireball = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const { state } = scene;

	const activeChara = UnitManager.getChara(unit.id);
	if (!activeChara) {
		console.warn(`[fireball] Active Chara not found for unit ID: ${unit.id}`);
		return;
	}

	const targetUnit = await approach(activeChara); // approach returns the target Unit
	if (!targetUnit) {
		console.warn(`[fireball] No target Unit found by approach for Chara: ${activeChara.unit.name} (ID: ${activeChara.unit.id})`);
		return;
	}

	const targetChara = UnitManager.getChara(targetUnit.id);
	if (!targetChara) {
		console.warn(`[fireball] Target Chara not found for target Unit ID: ${targetUnit.id}`);
		return;
	}

	popText({ text: "Fireball", targetId: unit.id });

	await fireballEffect(scene, getOption('speed'), activeChara, targetChara);

	// pick enemies in the cell and around the cell
	const splashTargets = getUnitsByProximity(state, targetUnit, false, 2);

	// deal damage to all targets
	targetChara.damageUnit(unit.id, unit.attackPower);
	splashTargets.forEach(splashAffectedUnit => {
		UnitManager.getChara(splashAffectedUnit.id)?.damageUnit(unit.id, unit.attackPower / 2);
	});
}
