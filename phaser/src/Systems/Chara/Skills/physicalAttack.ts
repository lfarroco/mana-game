import { impactEffect } from "../../../Effects";
import { getState } from "../../../Models/State";
import { delay } from "../../../Utils/animation";
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
	const isCritical = dice <= activeChara.unit.crit;

	const rawDmg = isCritical ? activeChara.unit.attack * 2 : activeChara.unit.attack;
	const damage = Math.max(1, rawDmg - targetChara.unit.defense);



	await Promise.all(
		activeChara.unit.events
			.onAttackByMe
			.map(fn => fn(activeChara.unit, targetChara.unit)())
	);

	await Promise.all(
		targetChara.unit.events
			.onDefendByMe.map(fn => fn(activeChara.unit, targetChara.unit)())
	);

	await damageUnit(targetChara.id, damage, isCritical);

	await Promise.all(
		activeChara.unit.events
			.onAfterAttackByMe.map(fn => fn(activeChara.unit, targetChara.unit)())
	);

	await delay(scene, 300 / speed);

}
