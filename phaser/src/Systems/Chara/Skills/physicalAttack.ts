import { impactEffect } from "../../../Effects";
import { getState } from "../../../Models/State";
import { runAttackEventTraits, runUnitEventWithTargetTraits } from "../../../Models/Traits";
import { Chara } from "../Chara";

export async function physicalAttack(
	activeChara: Chara,
	targetChara: Chara,
) {
	const { parent: scene } = activeChara;
	const { speed } = getState().options;

	impactEffect({
		scene,
		location: targetChara,
		pointA: activeChara,
		pointB: targetChara,
		speed,
	});

	const dice = Math.floor(Math.random() * 100);

	const evaded = dice <= targetChara.unit.evade;

	const isCritical = dice <= activeChara.unit.crit;

	const rawDmg = isCritical ? activeChara.unit.attackPower * 2 : activeChara.unit.attackPower;
	let damage = Math.max(1, rawDmg - targetChara.unit.defense);

	// TODO: use a hook for this
	// hook: onbeforeAttackByMe
	// receive base damage (without other modifiers)
	// returns new damage, or attack cancel
	// then, sum with all the other modifiers
	if (activeChara.unit.statuses["double_damage"])
		damage *= 2;

	runAttackEventTraits("onAttackByMe", targetChara.unit, damage, isCritical, evaded)(activeChara.unit);

	runUnitEventWithTargetTraits("onDefendByMe", targetChara.unit)(activeChara.unit);

	if (evaded) {
		runUnitEventWithTargetTraits("onEvadeByMe", targetChara.unit)(activeChara.unit)
	} else {
		targetChara.damageUnit(damage, isCritical);
	}

	runAttackEventTraits("onAfterAttackByMe", targetChara.unit, damage, isCritical, evaded)(activeChara.unit);

}
