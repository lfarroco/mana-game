import { impactEffect } from "../../../Effects";
import { getState } from "../../../Models/State";
import { Chara, damageUnit } from "../Chara";

export async function physicalAttack(
	activeChara: Chara,
	targetChara: Chara,
) {
	const { scene } = activeChara;
	const { speed } = getState().options;

	impactEffect({
		scene,
		location: targetChara.container,
		pointA: activeChara.container,
		pointB: targetChara.container,
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

	activeChara.unit.events
		.onAttackByMe
		.map(fn => fn(activeChara.unit, targetChara.unit, damage, isCritical, evaded)())

	targetChara.unit.events
		.onDefendByMe.map(fn => fn(activeChara.unit, targetChara.unit)())

	if (evaded) {
		targetChara.unit.events
			.onEvadeByMe
			.map(fn => fn(targetChara.unit, activeChara.unit)())
	} else {
		damageUnit(targetChara.id, damage, isCritical);
	}

	activeChara.unit.events
		.onAfterAttackByMe.map(fn => fn(activeChara.unit, targetChara.unit, damage, isCritical, evaded)())

}
