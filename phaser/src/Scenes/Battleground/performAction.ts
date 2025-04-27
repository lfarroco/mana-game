import * as Skill from "../../Models/Skill";
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
import { shoot } from "../../Systems/Chara/Skills/shoot";
import { slash } from "../../Systems/Chara/Skills/slash";
import { summon } from "../../Systems/Chara/Skills/summon";
import BattlegroundScene from "./BattlegroundScene";
import { shadowStep } from "../../Systems/Chara/Skills/shadowStep";
import { getAllActiveFoes } from "../../Models/State";
import * as UnitManager from "./Systems/UnitManager";
import { getJob } from "../../Models/Job";

export const performAction = (scene: BattlegroundScene) => (unit: Unit) => async () => {

	console.log("[action] :: ", unit.job, ":: start", unit.id)

	const activeFoes = getAllActiveFoes(scene.state)(unit.force);

	if (activeFoes.length === 0) return;

	const activeChara = UnitManager.getChara(unit.id);

	if (unit.statuses.stun?.duration > 0) return;

	const job = getJob(unit.job);

	const skillId = job.skill;

	if (skillId === Skill.SUMMON_BLOB) {

		await specialAnimation(activeChara);

		await summon(activeChara);

	} else if (skillId === Skill.MULTISHOT) {

		await specialAnimation(activeChara);

		await multishot(unit, activeChara, scene);

	} else if (skillId === Skill.HEALING_WAVE) {

		await specialAnimation(activeChara);

		await healingWave(scene, unit);

	} else if (skillId === Skill.FEINT) {
		await specialAnimation(activeChara);

		await feint(scene, unit);

	} else if (skillId === Skill.FIREBALL) {
		await specialAnimation(activeChara);

		await fireball(scene)(unit);

	} else if (skillId === Skill.SHADOWSTEP) {

		await shadowStep(scene, unit, activeChara, Skill.getSkill(Skill.SLASH));

	} else if (skillId === "slash") {
		await slash(scene, unit);
	}
	else if (skillId === Skill.HEAL) {
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
