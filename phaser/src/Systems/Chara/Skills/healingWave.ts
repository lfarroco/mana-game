import Phaser from "phaser";
import { asVec2, Vec2 } from "../../../Models/Geometry";
import { delay } from "../../../Utils/animation";
import { Unit } from "../../../Models/Unit";
import { getUnitsByProximity } from "../../../Models/Board";
import { BattlegroundScene } from "../../../Scenes/Battleground/BattlegroundScene";
import { EnergyBeam } from "../../../Effects/EnergyBeam";
import { healingHitEffect } from "../../../Effects/healingHitEffect";
import { getSkill, HEALING_WAVE } from "../../../Models/Skill";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";

/**
 * Performs a healing wave skill that targets allies with low health.
 * 
 * This function identifies allies near the casting unit who have less than 70% health,
 * sorts them by health percentage, and heals up to 3 of the most damaged allies.
 * If no allies need healing, it performs a light orb skill instead.
 * The healing effect is visualized with a wave animation connecting the healed units.
 * 
 * @param scene - The battleground scene where the skill is being used
 * @param unit - The unit casting the healing wave skill
 */
export async function healingWave(scene: BattlegroundScene, unit: Unit) {

	const skill = getSkill(HEALING_WAVE);

	const allies = getUnitsByProximity(scene.state, unit, false, 5)
		.concat([unit]);

	const hurtAllies = allies
		.map(unit => {
			const percentage = unit.hp / unit.maxHp;
			return {
				unit,
				percentage
			}
		})
		.sort((a, b) => b.percentage - a.percentage)
		.map(({ unit }) => unit);

	const top3 = hurtAllies.slice(0, 3);

	top3.forEach(ally => {
		UnitManager.getChara(ally.id).healUnit(skill.power);
	});

	const charas = [UnitManager.getChara(unit.id)].concat(top3.map(u => UnitManager.getChara(u.id)))

	await animation(scene, charas.map(c => asVec2(c)));

}

/**
 * Creates a visual animation showing energy beams connecting between targets.
 * 
 * Generates energy beam effects between each consecutive target in the provided array,
 * creates healing hit effects at each target position, and manages the animation
 * lifecycle including creation, updates during the animation duration, and cleanup.
 * 
 * @param scene - The battleground scene where the animation will be displayed
 * @param targets - Array of positions where healing effects should be displayed
 */
async function animation(scene: BattlegroundScene, targets: Vec2[]) {
	const lifespan = 1000;

	const waves = targets.reduce((acc, target, i) => {

		const next = targets[i + 1];
		if (!next) return acc;

		const beam = new EnergyBeam(scene, {
			start: target,
			end: next,
			segments: 8,
			amplitude: 15,
			frequency: 1,
			thickness: 10,
			color: 0xFFD700,
			speed: 0.1
		})
		const beam2 = new EnergyBeam(scene, {
			start: target,
			end: next,
			segments: 8,
			amplitude: 15,
			frequency: 1,
			thickness: 5,
			color: 0xFFD700,
			speed: 0.1
		})
		beam.phase = 1.2;

		beam.setAlpha(0);

		beam2.setAlpha(0);

		scene.tweens.add({
			targets: [beam, beam2],
			alpha: 0.5,
			duration: lifespan / 2,
			ease: Phaser.Math.Easing.Quadratic.Out,
			onComplete: () => {
				scene.tweens.add({
					targets: [beam, beam2],
					alpha: 0,
					duration: lifespan / 2,
					ease: Phaser.Math.Easing.Quadratic.In,
				})
			}
		})

		return acc.concat([beam, beam2])

	}, [] as EnergyBeam[]);

	const update = () => {
		waves.forEach(wave => wave.updateBeam());
	}

	scene.events.on(Phaser.Scenes.Events.UPDATE, update);

	targets.forEach(t => healingHitEffect(scene, t, lifespan, scene.speed));

	await (delay(scene, lifespan));

	scene.events.off(Phaser.Scenes.Events.UPDATE, update);

	waves.forEach(wave => wave.destroy());

}