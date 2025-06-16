import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { GlowingOrb } from "../../../Effects/GlowingOrb";
import { delay } from "../../../Utils/animation";
import { approach } from "../approach";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";
import { getOption } from "../../../Models/OptionsStore";

export const lightOrb = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const damage = Math.floor(unit.attackPower / 2);

	const activeChara = UnitManager.getChara(unit.id);
	if (!activeChara) return;

	const target = await approach(activeChara);
	const targetChara = UnitManager.getChara(target.id);
	if (!targetChara) return;

	const orb = new GlowingOrb(scene,
		activeChara.x, activeChara.y,
		targetChara,
		500 / getOption('speed')
	).setScale(0.5);

	await delay(scene, 500);

	await targetChara.damageUnit(unit.id, damage);

	await delay(scene, 1000);

	orb.destroy();
}
