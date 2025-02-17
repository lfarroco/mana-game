import { getState } from "../../../Models/State";
import { popText } from "./popText";
import { Chara } from "../Chara";
import { delay, tween } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";

export async function slashAnimation(
	scene: BattlegroundScene,
	activeChara: Chara,
	targetChara: Chara,
	damage: number) {

	const state = getState();
	const { speed } = state.options;

	scene.playFx("audio/sword2");

	await delay(scene, 300 / speed);

	const angle = Phaser.Math.Angle.BetweenPoints(
		activeChara.container,
		targetChara.container
	);

	const particles = scene.add.particles(
		targetChara.container.x, targetChara.container.y,
		'light', {
		speed: 100 * speed,
		lifespan: 600 / speed,
		angle: {
			min: Phaser.Math.RadToDeg(angle) - 30,
			max: Phaser.Math.RadToDeg(angle) + 30
		},
		gravityY: 0,
		alpha: { start: 1, end: 0, ease: 'sine.out' },
		maxAliveParticles: 5,
		scale: { min: 0.5, max: 1, },
		stopAfter: 5
		//blendMode: 'ADD',
	});

	popText(scene, damage.toString(), targetChara.unit.id);

	tween(scene, {
		targets: targetChara.container,
		alpha: 0.5,
		duration: 100 / speed,
		yoyo: true,
		repeat: 4,
	});

	await delay(scene, 600 / speed);

	particles.destroy();

}
