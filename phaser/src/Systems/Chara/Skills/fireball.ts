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

	console.log("fireball!")

	const { state } = scene;

	const activeChara = UnitManager.getChara(unit.id);
	if (!activeChara) return;

	const target = await approach(activeChara);

	const targetChara = UnitManager.getChara(target.id);
	if (!targetChara) return;

	popText({ text: "Fireball", targetId: unit.id });

	await fireballEffect(scene, getOption('speed'), activeChara, targetChara);

	// pick enemies in the cell and around the cell
	const targets = getUnitsByProximity(state, target, false, 2)

	// deal damage to all targets

	targetChara.damageUnit(unit.id, unit.attackPower);

	targets.forEach(target => {
		UnitManager.getChara(target.id)?.damageUnit(unit.id, unit.attackPower / 2);
	});

}
