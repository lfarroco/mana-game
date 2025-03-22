import { getSkill, LIGHT_ORB } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getUnitsByProximity } from "../../../Models/State";
import { popText } from "../Animations/popText";
import { emit, signals } from "../../../Models/Signals";
import { GlowingOrb } from "../../../Effects/GlowingOrb";
import { delay } from "../../../Utils/animation";
import { healingHitEffect } from "../../../Effects/healingHitEffect";
import { approach } from "../approach";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";

export const lightOrb = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const { state } = scene;

	const skill = getSkill(LIGHT_ORB);

	const damage = skill.power;
	const heal = skill.power * 2;

	const candidates = await approach(UnitManager.getChara(unit.id), skill.range, true);

	if (!candidates) return;

	// allied with lower hp
	const [target] = candidates.sort((a, b) => a.hp - b.hp);

	const activeChara = UnitManager.getChara(unit.id);
	const targetChara = UnitManager.getChara(target.id);

	await popText(scene, skill.name, unit.id);

	// get allies surrounding target
	const allies = getUnitsByProximity(state, target, true, 1)
		.filter(u => u.hp < u.maxHp);

	const orb = new GlowingOrb(scene,
		activeChara.container.x, activeChara.container.y,
		targetChara.container,
		500 / state.options.speed
	).setScale(0.5);

	await delay(scene, 500 / state.options.speed);

	// TODO: display pop text on damage using listener
	emit(signals.DAMAGE_UNIT, targetChara.id, damage);

	popText(scene, damage.toString(), targetChara.unit.id);

	allies.forEach(ally => {

		const chara = UnitManager.getChara(ally.id);

		emit(signals.HEAL_UNIT, ally.id, heal);

		healingHitEffect(
			scene,
			chara.container,
			1000 / state.options.speed,
			scene.speed,
		);
		popText(scene, heal.toString(), ally.id);
	});

	await delay(scene, 1000 / state.options.speed);

	orb.destroy();
}


