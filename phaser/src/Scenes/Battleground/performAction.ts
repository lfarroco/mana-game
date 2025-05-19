import * as Skill from "../../Models/Skill";
import { Unit } from "../../Models/Unit";
import { arcaneMissiles } from "../../Systems/Chara/Skills/arcaneMissiles";
import { explode } from "../../Systems/Chara/Skills/explode";
import { feint } from "../../Systems/Chara/Skills/feint";
import { fireball } from "../../Systems/Chara/Skills/fireball";
import { lightOrb } from "../../Systems/Chara/Skills/lightOrb";
import { multishot } from "../../Systems/Chara/Skills/multishot";
import { summon } from "../../Systems/Chara/Skills/summon";
import BattlegroundScene from "./BattlegroundScene";
import { shadowStep } from "../../Systems/Chara/Skills/shadowStep";
import { getAllActiveFoes } from "../../Models/State";
import * as UnitManager from "./Systems/UnitManager";
import { BLOB, getCard, SKELETON } from "../../Models/Card";
import { song } from "../../Systems/Chara/Skills/song";
import { getTrait } from "../../Models/Traits";

export const performAction = (scene: BattlegroundScene) => (unit: Unit) => async () => {

	console.log("[action] :: ", unit.job, ":: start", unit.id)

	const activeFoes = getAllActiveFoes(scene.state)(unit.force);

	if (activeFoes.length === 0) return;

	const activeChara = UnitManager.getChara(unit.id);

	if (unit.statuses.stun?.duration > 0) return;

	const card = getCard(unit.job);

	const skillId = card.skill;

	card.traits.forEach(t => {
		const trait = getTrait()(t);
		trait.events.onAction.forEach(e => {
			e(unit)();
		});
	});


	if (skillId === Skill.SUMMON_BLOB) {

		summon(activeChara, BLOB);

	} else if (skillId === Skill.SUMMON_SKELETON) {
		summon(activeChara, SKELETON);

	} else if (skillId === Skill.SONG) {
		song(scene, unit);
	} else if (skillId === Skill.MULTISHOT) {

		multishot(unit, activeChara, scene);

	} else if (skillId === Skill.FEINT) {
		feint(scene, unit);

	} else if (skillId === Skill.FIREBALL) {

		fireball(scene)(unit);

	} else if (skillId === Skill.SHADOWSTEP) {

		shadowStep(scene, unit, activeChara, Skill.getSkill(Skill.SLASH));

	}
	else if (skillId === "light-orb") {
		lightOrb(scene)(unit);
	} else if (skillId === "arcane-missiles") {
		arcaneMissiles(scene)(unit);
	} else if (skillId === "explode") {
		explode(scene)(unit);
	}

	console.log("[action] :: ", unit.job, ":: end")

};
