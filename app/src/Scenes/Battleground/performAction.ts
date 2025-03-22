import { getJob } from "../../Models/Job";
import { FEINT, FIREBALL, getSkill, HEAL, HEALING_WAVE, MULTISHOT, SHADOWSTEP, SHIELDBASH, SUMMON_BLOB } from "../../Models/Skill";
import { Unit } from "../../Models/Unit";
import { specialAnimation } from "../../Systems/Chara/Animations/specialAnimation";
import { arcaneMissiles } from "../../Systems/Chara/Skills/arcaneMissiles";
import { explode } from "../../Systems/Chara/Skills/explode";
import { feint } from "../../Systems/Chara/Skills/feint";
import { fireball } from "../../Systems/Chara/Skills/fireball";
import { healing } from "../../Systems/Chara/Skills/healing";
import { healingWave } from "../../Systems/Chara/Skills/healingWave";
import { lightOrb } from "../../Systems/Chara/Skills/lightOrb";
import { multishot } from "../../Systems/Chara/Skills/multishot";
import { shieldBash } from "../../Systems/Chara/Skills/shieldBash";
import { shoot } from "../../Systems/Chara/Skills/shoot";
import { slash } from "../../Systems/Chara/Skills/slash";
import { summon } from "../../Systems/Chara/Skills/summon";
import BattlegroundScene from "./BattlegroundScene";
import { shadowStep } from "../../Systems/Chara/Skills/shadowStep";
import { getAllActiveFoes } from "../../Models/State";
import * as UnitManager from "./Systems/UnitManager";

export const performAction = (
	scene: BattlegroundScene
) => (
	unit: Unit
) => async () => {

	console.log("[action] :: ", unit.job, ":: start", unit.id)

	if (unit.hp <= 0) {
		console.log("unit is dead. skipping turn");
		return;
	}

	const activeFoes = getAllActiveFoes(scene.state)(unit.force);

	if (activeFoes.length === 0) return;

	const job = getJob(unit.job);

	const activeChara = UnitManager.getChara(unit.id);

	const availableSkills = job.skills.filter(skillId => {
		const cooldown = unit.cooldowns[skillId];

		return cooldown === 0;
	});

	// decrease cooldowns
	job.skills.forEach(skillId => {
		unit.cooldowns[skillId] = Math.max(0, unit.cooldowns[skillId] - 1);
	});

	if (unit.statuses.stun >= 0) return;

	let [skillId] = availableSkills;

	const skill = getSkill(skillId);

	// TODO: try to cast special, otherwise, basic attack

	if (skillId === SHIELDBASH) {

		const casted = await shieldBash(scene, activeChara.unit);
		if (casted) {
			unit.cooldowns[skillId] = skill.cooldown;
		}

	} else if (skillId === SUMMON_BLOB) {

		await specialAnimation(activeChara);

		await summon(unit, scene);

		unit.cooldowns[skillId] = skill.cooldown;

	} else if (skillId === MULTISHOT) {

		await specialAnimation(activeChara);

		await multishot(unit, activeChara, scene);

		unit.cooldowns[skillId] = skill.cooldown;

	} else if (skillId === HEALING_WAVE) {

		await specialAnimation(activeChara);

		await healingWave(scene, unit);

		unit.cooldowns[skillId] = skill.cooldown;

	} else if (skillId === FEINT) {
		await specialAnimation(activeChara);

		await feint(scene, unit);
		unit.cooldowns[skillId] = skill.cooldown;

	} else if (skillId === FIREBALL) {
		await specialAnimation(activeChara);

		await fireball(scene)(unit);
		unit.cooldowns[skillId] = skill.cooldown;

	} else if (skillId === SHADOWSTEP) {

		const casted = await shadowStep(scene, unit, activeChara, skill);

		if (!casted) {
			skillId = availableSkills[1];
		}

	}

	if (skillId === "slash") {
		await slash(scene, unit);
	}
	else if (skillId === HEAL) {
		await healing(scene)(unit);
	}
	else if (skillId === "shoot") {
		await shoot(scene)(unit);
	} else if (skillId === "light-orb") {
		await lightOrb(scene)(unit);
	} else if (skillId === "arcane-missiles") {
		await arcaneMissiles(scene)(unit);
	} else if (skillId === "explode") {
		await explode(scene)(unit);
	}

	console.log("[action] :: ", unit.job, ":: end")

};
