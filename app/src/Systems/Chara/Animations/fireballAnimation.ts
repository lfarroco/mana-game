import { emit, signals } from "../../../Models/Signals";
import { Unit } from "../../../Models/Unit";
import { popText } from "./popText";
import { tween } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";

export async function fireballAnimation(scene: BattlegroundScene, unit: Unit, target: Unit) {

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
			//purple tones
			tint: [0x8a2be2, 0x9400d3, 0x9932cc, 0xba55d3, 0xda70d6, 0xdda0dd, 0xee82ee, 0xff00ff],
			lifespan: 400,
			alpha: { start: 1, end: 0 },
			scale: { start: 1, end: 0 },
			//blendMode: 'ADD',

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
