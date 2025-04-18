import { impactEffect, criticalDamageDisplay } from "../../../Effects";
import { emit, signals } from "../../../Models/Signals";
import { getState } from "../../../Models/State";
import { runPromisesInOrder } from "../../../utils";
import { tween, delay } from "../../../Utils/animation";
import { popText } from "../Animations/popText";
import { Chara } from "../Chara";

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

	if (isCritical) {
		criticalDamageDisplay(scene, targetChara.container, damage, speed);
	} else {
		popText({ text: damage.toString(), targetId: targetChara.unit.id });
	}

	tween({
		targets: [targetChara.container],
		alpha: 0.5,
		duration: 100 / speed,
		yoyo: true,
		repeat: 4,
	});

	await runPromisesInOrder(
		activeChara.unit.events
			.onAttackByMe.map(fn => fn(activeChara.unit, targetChara.unit))
	);

	await runPromisesInOrder(
		targetChara.unit.events
			.onDefendByMe.map(fn => fn(activeChara.unit, targetChara.unit))
	);

	emit(signals.DAMAGE_UNIT, targetChara.id, damage);

	await delay(scene, 300 / speed);

}
