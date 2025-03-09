import { asVec2 } from "../../Models/Geometry";
import { getJob } from "../../Models/Job";
import { getSkill } from "../../Models/Skill";
import { Unit } from "../../Models/Unit";
import { specialAnimation } from "../../Systems/Chara/Animations/specialAnimation";
import { approach } from "../../Systems/Chara/approach";
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
import { panTo } from "./ProcessTick";

export const performAction = (
	scene: BattlegroundScene
) => (
	unit: Unit
) => async () => {

	if (unit.hp <= 0) return;

	const job = getJob(unit.job);

	const activeChara = scene.getChara(unit.id);

	await panTo(scene, asVec2(activeChara.container));

	const availableSkills = job.skills.filter(skillId => {
		const cooldown = unit.cooldowns[skillId];

		return cooldown === 0;
	});

	// decrease cooldowns
	job.skills.forEach(skillId => {
		unit.cooldowns[skillId] = Math.max(0, unit.cooldowns[skillId] - 1);
	});

	if (unit.statuses.stun >= 0) return;

	const [skillId] = availableSkills;

	const skill = getSkill(skillId);

	// TODO: try to cast special, otherwise, basic attack

	if (skillId === "shieldbash") {

		const casted = await shieldBash(scene, activeChara.unit);
		if (casted) {
			unit.cooldowns[skillId] = skill.cooldown;
		}

	} else if (skillId === "summon_blob") {

		await specialAnimation(activeChara);

		await summon(unit, scene);

		unit.cooldowns[skillId] = skill.cooldown;

	} else if (skillId === "multishot") {

		await specialAnimation(activeChara);

		await multishot(unit, activeChara, scene);

		unit.cooldowns[skillId] = skill.cooldown;

	} else if (skillId === "healing-wave") {

		await specialAnimation(activeChara);

		await healingWave(scene, unit);

		unit.cooldowns[skillId] = skill.cooldown;

	} else if (skillId === "feint") {
		await specialAnimation(activeChara);

		await feint(scene, unit);
		unit.cooldowns[skillId] = skill.cooldown;
	} else if (skillId === "fireball") {
		await specialAnimation(activeChara);

		await fireball(scene)(unit);
		unit.cooldowns[skillId] = skill.cooldown;
	}

	if (skillId === "slash") {
		const mtarget = await approach(activeChara, 1, true);
		if (mtarget)
			await slash(scene, unit, mtarget);
	}
	else if (skillId === "heal") {
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

};
