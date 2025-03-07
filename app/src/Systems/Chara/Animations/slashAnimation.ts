import { getState } from "../../../Models/State";
import { popText } from "./popText";
import { Chara } from "../Chara";
import { delay, tween } from "../../../Utils/animation";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { emit, signals } from "../../../Models/Signals";

export async function slashAnimation(
	scene: BattlegroundScene,
	activeChara: Chara,
	targetChara: Chara,
) {

	let fxs = [] as Phaser.GameObjects.GameObject[];

	const state = getState();
	const { speed } = state.options;

	scene.playFx("audio/sword2");

	await delay(scene, 300 / speed);

	const dodges = targetChara.unit.statuses["next-dodge"] > 0;

	if (dodges) {
		popText(scene, "Dodge", targetChara.unit.id);
		delete targetChara.unit.statuses["next-dodge"];
		return;
	}

	const angle = Phaser.Math.Angle.BetweenPoints(
		activeChara.container,
		targetChara.container
	);

	const particles = scene.add.particles(
		targetChara.container.x, targetChara.container.y,
		'white-dot', {
		speed: 200 * speed,
		lifespan: 600 / speed,
		angle: {
			min: Phaser.Math.RadToDeg(angle) - 40,
			max: Phaser.Math.RadToDeg(angle) + 40
		},
		gravityY: 0,
		alpha: { start: 1, end: 0, ease: 'sine.out' },
		maxAliveParticles: 5,
		scale: { min: 0.5, max: 2, },
		stopAfter: 5
	});

	const isCritical = activeChara.unit.statuses["next-critical"] > 0;

	const damage = isCritical ? activeChara.unit.attack * 2 : activeChara.unit.attack;

	if (isCritical) {
		const critBg = scene.add.image(
			targetChara.container.x, targetChara.container.y,
			'damage_display'
		);
		critBg.setScale(0);


		const dmg = scene.add.text(
			targetChara.container.x, targetChara.container.y,
			`${damage}`,
			{
				fontSize: '96px',
				color: '#000000',
				stroke: '#000000',
				strokeThickness: 4,
				align: 'center',
				fontStyle: 'bold',
			}
		)
		dmg.setOrigin(0.5);
		dmg.setScale(0);

		tween({
			targets: [critBg, dmg],
			scale: 0.4,
			duration: 500 / speed,
			//elastic
			ease: 'Bounce.easeOut',
			onComplete: () => {
				tween({
					targets: [critBg, dmg],
					alpha: 0,
					duration: 500 / speed,
				})
			}
		});

		activeChara.unit.statuses["next-critical"] = 0;

		fxs.push(critBg, dmg);


	} else {

		popText(scene, damage.toString(), targetChara.unit.id);
	}

	tween({
		targets: [targetChara.container],
		alpha: 0.5,
		duration: 100 / speed,
		yoyo: true,
		repeat: 4,
	});

	emit(
		signals.DAMAGE_UNIT,
		targetChara.id,
		damage
	);

	await delay(scene, 1000 / speed);

	particles.destroy();

	fxs.forEach(fx => fx.destroy());

}
