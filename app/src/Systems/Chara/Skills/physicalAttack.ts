import { impactEffect, criticalDamageDisplay } from "../../../Effects";
import { emit, signals } from "../../../Models/Signals";
import { getState } from "../../../Models/State";
import { tween, delay } from "../../../Utils/animation";
import { popText } from "../Animations/popText";
import { Chara } from "../Chara";

export async function physicalAttack(
	activeChara: Chara,
	targetChara: Chara,
) {
	const { scene } = activeChara;
	const { speed } = getState().options;

	const dodges = targetChara.unit.statuses["next-dodge"] > 0;

	if (dodges) {
		await popText(scene, "Dodge", targetChara.unit.id);
		delete targetChara.unit.statuses["next-dodge"];
		return;
	}

	impactEffect({
		scene,
		location: targetChara.container,
		pointA: activeChara.container,
		pointB: targetChara.container,
		speed,
	});

	const isCritical = activeChara.unit.statuses["next-critical"] > 0;

	const rawDmg = isCritical ? activeChara.unit.attack * 3 : activeChara.unit.attack;
	const damage = Math.max(1, rawDmg - targetChara.unit.defense);

	if (isCritical) {
		criticalDamageDisplay(scene, targetChara.container, damage, speed);

		activeChara.unit.statuses["next-critical"] = 0;
	} else {
		popText(scene, damage.toString(), targetChara.unit.id);
	}

	tween({
		targets: [targetChara.container],
		alpha: 0.5,
		duration: 100 / speed,
		yoyo: true,
		repeat: 4,
	});

	emit(signals.DAMAGE_UNIT, targetChara.id, damage);

	await delay(scene, 300 / speed);

}
