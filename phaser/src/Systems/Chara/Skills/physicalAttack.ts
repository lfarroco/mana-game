import { impactEffect } from "../../../Effects";
import { Chara } from "../Chara";
import { GameEvents } from "../../../constants/events";

export async function physicalAttack(
	activeChara: Chara,
	targetChara: Chara,
) {
	const { scene: scene } = activeChara;

	impactEffect({
		scene,
		location: targetChara,
		pointA: activeChara,
		pointB: targetChara,
	});

	const dice = Math.floor(Math.random() * 100);

	const evaded = dice <= targetChara.unit.evade;

	const isCritical = dice <= activeChara.unit.crit;

	const rawDmg = isCritical ? activeChara.unit.power * 2 : activeChara.unit.power;
	const damage = rawDmg;

	// Emit event for TRAIT_EVAL_ATTACK_BY_ME
	scene.events.emit(GameEvents.TRAIT_EVAL_ATTACK_BY_ME, { unit: activeChara.unit, target: targetChara.unit, damage, isCritical, evaded });

}
