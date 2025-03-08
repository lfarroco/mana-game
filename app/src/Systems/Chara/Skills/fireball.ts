import { snakeDistanceBetween, Vec2 } from "../../../Models/Geometry";
import { getJob } from "../../../Models/Job";
import { getSkill } from "../../../Models/Skill";
import { Unit } from "../../../Models/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { walk } from "../../../Scenes/Battleground/ProcessTick";
import { getUnitsByProximity } from "../../../Models/State";
import { lookupAIPAth } from "../../../Scenes/Battleground/Systems/Pathfinding";
import { popText } from "../Animations/popText";
import { tween } from "../../../Utils/animation";
import { emit, signals } from "../../../Models/Signals";

export const fireball = (
	scene: BattlegroundScene
) => async (unit: Unit) => {

	const { state } = scene;

	const job = getJob(unit.job);

	const attackRange = getSkill('fireball').range;

	const [target] = getUnitsByProximity(state, unit, true);

	if (!target) {
		console.warn("No enemy found");
		return;
	};

	const distance = snakeDistanceBetween(unit.position)(target.position);

	if (distance > attackRange) {

		const pathTo = await lookupAIPAth(scene, unit.id, unit.position, target.position, job.moveRange);

		await walk(scene, unit, pathTo, (position: Vec2) => {
			const distance = snakeDistanceBetween(position)(target.position);
			return distance <= attackRange;
		});

	}

	if (snakeDistanceBetween(unit.position)(target.position) > attackRange) return;

	const unitChara = scene.getChara(unit.id);
	const targetChara = scene.getChara(target.id);

	popText(scene, "Fireball", unit.id);

	const angle = Phaser.Math.Angle.Between(
		unitChara.container.x, unitChara.container.y,
		targetChara.container.x, targetChara.container.y
	);

	const particles = scene.add.particles(
		unitChara.container.x,
		unitChara.container.y,
		'light',
		{
			// make particles move in the direction of the angle, using the speed
			speedX:
			{
				min: -Math.cos(angle) * 200,
				max: -Math.cos(angle) * 400
			},
			speedY: {
				min: -Math.sin(angle) * 200,
				max: -Math.sin(angle) * 400
			},
			angle: { min: angle - 60, max: angle + 60 },
			//red, yellow and orage tones
			tint: [0xff0000, 0xffff00, 0xffa500],
			lifespan: 400,
			alpha: { start: 1, end: 0 },
			scale: { start: 1, end: 0 },
			blendMode: 'ADD',

		}

	)

	await tween({
		targets: [particles],
		x: targetChara.container.x,
		y: targetChara.container.y,
		duration: 500 / scene.state.options.speed,
	});

	popText(scene, unit.attack.toString(), target.id);
	particles.destroy();

	emit(
		signals.DAMAGE_UNIT,
		targetChara.id,
		unit.attack
	);

}
