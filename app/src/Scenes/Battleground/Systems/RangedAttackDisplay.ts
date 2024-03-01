import { getDirection } from "../../../Models/Direction";
import { Vec2, asVec2 } from "../../../Models/Geometry";
import { getJob } from "../../../Models/Job";
import { signals, listeners } from "../../../Models/Signals";
import { State } from "../../../Models/State";
import { Unit, isAttacking } from "../../../Models/Unit";
import BattlegroundScene from "../BattlegroundScene";
import { HALF_TILE_HEIGHT } from "../constants";

type DisplayIndex = {
	[key: string]:
	{
		targetId: string,
		graphic: Phaser.GameObjects.Graphics,
		arrowTip: Phaser.GameObjects.Image,
		tween: Phaser.Tweens.Tween
	}
}

export function init(scene: BattlegroundScene, state: State) {

	let displayIndex: DisplayIndex = {}

	listeners([
		[signals.ATTACK_STARTED, (attacker: string, target: string) => {

			renderLine(scene, state, displayIndex, attacker, target);
		}
		],
		[signals.UNIT_DESTROYED, (id: string) => {

			cleanUpMyLine(displayIndex, id);

			cleanupLinesAttackingMe(id, displayIndex);

		}],
		[signals.UNIT_LEAVES_CELL, (unitId: string, _vec: Vec2) => {

			cleanupLinesAttackingMe(unitId, displayIndex);

		}],
		[signals.UNIT_FINISHED_MOVE_ANIM, (unitId: string, vec: Vec2) => {

			// check if someone is attacking me

			renderLinesAttackingMe(state, unitId, scene, displayIndex);

		}],
		[signals.SELECT_UNIT_MOVE_DONE, (unitId: string) => {

			cleanUpMyLine(displayIndex, unitId);
		}]
	])
}
function renderLinesAttackingMe(state: State, unitId: string, scene: BattlegroundScene, displayIndex: DisplayIndex) {

	const me = state.gameData.units.find(u => u.id === unitId)

	if (!me) return

	state.gameData.units.forEach(unit => {

		if (isAttacking(unit.status)
			&& unit.status.target === unitId) {

			const attackerJob = getJob(unit.job)

			const distance = Phaser.Math.Distance.Between(
				unit.position.x,
				unit.position.y,
				me.position.x,
				me.position.y)

			if (distance > attackerJob.attackRange) {
				return;
			}

			renderLine(scene, state, displayIndex, unit.id, unitId);

		}

	});
}

function cleanupLinesAttackingMe(unitId: string, displayIndex: DisplayIndex) {

	Object.keys(displayIndex).forEach(key => {

		const value = displayIndex[key];
		if (value.targetId === unitId) {
			cleanUpMyLine(displayIndex, key);
		}
	});

}

function renderLine(scene: BattlegroundScene, state: State, displayIndex: DisplayIndex, attacker: string, target: string) {
	const unit = scene.getSquad(attacker)

	const job = getJob(unit.job)
	if (job.attackRange === 1) return

	const { graphics, arrowTip, tween } = drawLine(scene, unit, target, state.options.speed);

	displayIndex[attacker] = {
		targetId: target,
		graphic: graphics,
		arrowTip,
		tween
	};
}

function cleanUpMyLine(
	displayIndex: DisplayIndex,
	key: string,
) {

	const value = displayIndex[key];
	if (!value) return;
	value.graphic.destroy();
	value.arrowTip.destroy();
	value.tween.stop()
	delete displayIndex[key];
}

function drawLine(scene: BattlegroundScene, unit: Unit, targetId: string, speed: number) {

	const source = scene.getChara(unit.id)
	const target = scene.getChara(targetId)

	const graphics = scene.add.graphics()

	const distance = Phaser.Math.Distance.Between(source.sprite.x, source.sprite.y, target.sprite.x, target.sprite.y)

	const points = Phaser.Geom.Line.BresenhamPoints(
		new Phaser.Geom.Line(source.sprite.x, source.sprite.y, target.sprite.x, target.sprite.y),
		// number of steps varies with distance
		Math.ceil(distance / 10)
	)

	const arrowTip = scene.add.image(target.sprite.x, target.sprite.y, "arrow-top-emote")

	arrowTip.setScale(0.3).setAlpha(0.5).setTint(0xff0000)
	const direction = getDirection(asVec2(source.sprite), asVec2(target.sprite))

	arrowTip.setAngle({
		up: 0,
		down: 180,
		left: 270,
		right: 90
	}[direction])


	points.forEach((point, i) => {

		scene.time.addEvent({
			delay: 30 * i,
			callback: () => {

				if (graphics.active && point.x && point.y) {

					const start = points[i - 1]

					graphics.lineStyle(5, 0xff0000, 0.3)
					graphics.beginPath()
					graphics.moveTo(
						start?.x || source.sprite.x,
						(start?.y || source.sprite.y) + HALF_TILE_HEIGHT - 15,
					)
					graphics.lineTo(point.x, point.y + HALF_TILE_HEIGHT - 15)
					graphics.closePath()
					graphics.strokePath()
					arrowTip.setPosition(point.x, point.y + HALF_TILE_HEIGHT - 15)

				}
			}
		})
	})

	const tween = scene.add.tween({

		targets: [graphics, arrowTip],
		alpha: 0,
		duration: 666,
		ease: "Cubic",
		repeat: -1
	})

	return { graphics, arrowTip, tween }

}