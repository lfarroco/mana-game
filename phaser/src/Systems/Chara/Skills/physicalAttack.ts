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
		activeChara.unit
			.traits.filter(t => t.events.onAttackByMe)
			.map(u => u.events.onAttackByMe!(activeChara.unit, targetChara.unit))
	)

	await runPromisesInOrder(
		targetChara.unit
			.traits.filter(t => t.events.onDefendByMe)
			.map(u => u.events.onDefendByMe!(targetChara.unit, activeChara.unit))
	)

	emit(signals.DAMAGE_UNIT, targetChara.id, damage);

	await delay(scene, 300 / speed);

}
