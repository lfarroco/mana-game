import { snakeDistanceBetween, Vec2 } from "../../../Models/Geometry";
import { getJob } from "../../../Models/Job";
import { getSkill } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { walk } from "../../../Scenes/Battleground/ProcessTick";
import { getUnitsByProximity } from "../../../Models/State";
import { lookupAIPAth as lookupPath } from "../../../Scenes/Battleground/Systems/Pathfinding";
import { popText } from "../Animations/popText";
import { emit, signals } from "../../../Models/Signals";
import { GlowingOrb } from "../../../Effects/GlowingOrb";
import { delay } from "../../../Utils/animation";
import { healingHitEffect } from "../../../Effects/healingHitEffect";

export const lightOrb = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const { state } = scene;

	const job = getJob(unit.job);

	const skill = getSkill('light-orb');

	const damage = skill.power;
	const heal = skill.power * 2;

	const [target] = getUnitsByProximity(state, unit, true, skill.range);

	if (!target) {
		console.warn("No enemy found");
		return;
	};

	const unitChara = scene.getChara(unit.id);
	const targetChara = scene.getChara(target.id);

	const isInRange = () => snakeDistanceBetween(unit.position)(target.position) <= skill.range;

	if (!isInRange()) {

		const pathTo = await lookupPath(scene, unit.id, unit.position, target.position, job.moveRange);

		await walk(scene, unit, pathTo, (_position: Vec2) => {
			return isInRange()
		});

		if (!isInRange()) return;

	}

	popText(scene, skill.name, unit.id);

	// get allies surrounding target
	const allies = state.gameData.units.filter(u => {

		const distance = snakeDistanceBetween(target.position)(u.position)
		return distance <= 1
			&& u.force === unit.force
	});

	const orb = new GlowingOrb(scene,
		unitChara.container.x,
		unitChara.container.y,
		targetChara.container,
		1000 / state.options.speed
	).setScale(0.5);

	await delay(scene, 1000 / state.options.speed);

	// TODO: display pop text on damage using listener
	emit(signals.DAMAGE_UNIT, targetChara.id, damage);

	popText(scene, damage.toString(), targetChara.unit.id);

	allies.forEach(ally => {

		const chara = scene.getChara(ally.id);

		emit(signals.HEAL_UNIT, ally.id, heal);

		healingHitEffect(
			scene,
			chara.container,
			1000 / state.options.speed,
			scene.state.options.speed,
		);
		popText(scene, heal.toString(), ally.id);
	});

	await delay(scene, 1000 / state.options.speed);

	orb.destroy();
}


