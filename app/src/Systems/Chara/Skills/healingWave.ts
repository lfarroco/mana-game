import Phaser from "phaser";
import { asVec2, Vec2 } from "../../../Models/Geometry";
import { delay } from "../../../Utils/animation";
import { Unit } from "../../../Models/Unit";
import { getUnitsByProximity } from "../../../Models/State";
import { emit, signals } from "../../../Models/Signals";
import { BattlegroundScene } from "../../../Scenes/Battleground/BattlegroundScene";
import { EnergyBeam } from "../../../Effects/EnergyBeam";
import { healingHitEffect } from "../../../Effects/healingHitEffect";
import { getSkill, HEALING_WAVE } from "../../../Models/Skill";
import { approach } from "../approach";

export async function healingWave(scene: BattlegroundScene, unit: Unit) {

	const skill = getSkill(HEALING_WAVE);

	const target = await approach(scene.getChara(unit.id), skill.range, false);

	if (!target) return;

	const allies = getUnitsByProximity(scene.state, unit, false, 5)
		.concat([unit]);

	const hurtAllies = allies
		.filter(u => u.hp < u.maxHp)
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
		emit(signals.HEAL_UNIT, ally.id, skill.power);
	});

	const charas = [scene.getChara(unit.id)].concat(top3.map(u => scene.getChara(u.id)))

	await animation(scene, charas.map(c => asVec2(c.container)));

}


async function animation(scene: BattlegroundScene, targets: Vec2[]) {
	const lifespan = 1000 / scene.speed;

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