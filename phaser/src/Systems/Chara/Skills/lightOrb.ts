import { getSkill, LIGHT_ORB } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { GlowingOrb } from "../../../Effects/GlowingOrb";
import { delay } from "../../../Utils/animation";
import { approach } from "../approach";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";
import { damageUnit } from "../Chara";

export const lightOrb = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const { state } = scene;

	const skill = getSkill(LIGHT_ORB);

	const damage = skill.power;

	const target = await approach(UnitManager.getChara(unit.id));

	const activeChara = UnitManager.getChara(unit.id);
	const targetChara = UnitManager.getChara(target.id);

	const orb = new GlowingOrb(scene,
		activeChara.container.x, activeChara.container.y,
		targetChara.container,
		500 / state.options.speed
	).setScale(0.5);

	await delay(scene, 500);

	await damageUnit(targetChara.id, damage);

	await delay(scene, 1000);

	orb.destroy();
}


