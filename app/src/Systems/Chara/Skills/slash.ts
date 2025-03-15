import { getUnit } from "../../../Models/State";
import { Unit, unitLog } from "../../../Models/Unit";
import { bashPieceAnimation } from "../Animations/bashPieceAnimation";
import { popText } from "../Animations/popText";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { delay, tween } from "../../../Utils/animation";
import { emit, signals } from "../../../Models/Signals";
import { impactEffect } from "../../../Effects/impactEffect";
import { criticalDamageDisplay } from "../../../Effects/criticalDamageDisplay";
import { getJob } from "../../../Models/Job";

export async function slash(
	scene: BattlegroundScene,
	unit: Unit,
	target: Unit,
) {
	console.log("[skill] :: slash :: start", unit.job);
	const job = getJob(unit.job);
	const state = scene.state;
	const { speed } = state.options

	const activeChara = scene.getChara(unit.id);
	const targetUnit = getUnit(scene.state)(target.id);
	const targetChara = scene.getChara(targetUnit.id);

	if (targetUnit.hp <= 0) {
		throw new Error("target is dead");
	}

	await popText(scene, "Slash", unit.id);

	unitLog(unit, `will cast slash on ${targetUnit.id}`);

	bashPieceAnimation(activeChara, targetChara.container);

	scene.playFx("audio/sword2");

	await delay(scene, 300 / speed);

	// TODO: replace with function that checks for dodge
	// it will check for other factors including buffs
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

	// TODO: replace with function that checks for critical
	// it will check for other factors including buffs
	const isCritical = activeChara.unit.statuses["next-critical"] > 0;

	const damage = isCritical ? job.attack * 3 : job.attack;

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

	emit(
		signals.DAMAGE_UNIT,
		targetChara.id,
		damage
	);

	await delay(scene, 300 / speed);

	console.log("[skill] :: slash :: end", unit.job);
}
