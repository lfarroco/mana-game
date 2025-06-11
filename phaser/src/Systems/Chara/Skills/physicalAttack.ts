import { impactEffect } from "../../../Effects";
import { getState } from "../../../Models/State";
import { Chara } from "../Chara";
import { GameEvents } from "../../../constants/events";

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

	// Emit event for TRAIT_EVAL_ATTACK_BY_ME
	scene.events.emit(GameEvents.TRAIT_EVAL_ATTACK_BY_ME, { unit: activeChara.unit, target: targetChara.unit, damage, isCritical, evaded });

	// Emit event for TRAIT_EVAL_DEFEND_BY_ME
	// unit is the defender, attacker is the one attacking
	scene.events.emit(GameEvents.TRAIT_EVAL_DEFEND_BY_ME, { unit: targetChara.unit, attacker: activeChara.unit });

	if (evaded) {
		// Emit event for TRAIT_EVAL_EVADE_BY_ME
		// unit is the evader, attacker is the one attacking
		scene.events.emit(GameEvents.TRAIT_EVAL_EVADE_BY_ME, { unit: targetChara.unit, attacker: activeChara.unit });
	} else {
		targetChara.damageUnit(activeChara.unit.id, damage, isCritical);
	}

	// Emit event for TRAIT_EVAL_AFTER_ATTACK_BY_ME
	scene.events.emit(GameEvents.TRAIT_EVAL_AFTER_ATTACK_BY_ME, { unit: activeChara.unit, target: targetChara.unit, damage, isCritical, evaded });
}
