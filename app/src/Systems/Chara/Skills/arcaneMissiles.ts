import { getJob } from "../../../Models/Job";
import { getSkill } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { getUnitsByProximity } from "../../../Models/State";
import { popText } from "../Animations/popText";
import { emit, signals } from "../../../Models/Signals";
import * as animation from "../../../Effects/arcaneMissile";
import { delay } from "../../../Utils/animation";
import { approach } from "../approach";

export const arcaneMissiles = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const { state } = scene;
	const skill = getSkill('arcane-missiles');

	const closest = await approach(scene.getChara(unit.id), skill.range, true);

	if (!closest) return;

	const targets = getUnitsByProximity(state, unit, true, skill.range);

	if (targets.length === 0) {
		console.warn("No enemy found");
		return;
	};

	const activeChara = scene.getChara(unit.id);

	//pick 3 random indexes (can be repeated)
	const targetIndexes = Array.from({ length: 3 }, () => Math.floor(Math.random() * targets.length));

	popText(scene, skill.name, unit.id);

	targetIndexes.forEach(async (index) => {

		const target = targets[index];

		const targetChara = scene.getChara(target.id);

		await animation.arcaneMissle(scene, activeChara.container, targetChara.container, state.options.speed);

		popText(scene, activeChara.unit.attack.toString(), targetChara.unit.id);

		if (targetChara.unit.hp <= 0) return;

		emit(signals.DAMAGE_UNIT, targetChara.id, skill.power);

	});

	await delay(scene, 1000 / state.options.speed);

}


