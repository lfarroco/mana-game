import { Vec2 } from "../../../Models/Geometry";
import { getJob } from "../../../Models/Job";
import { events, listeners } from "../../../Models/Signals";
import { State, getState } from "../../../Models/State";
import { Unit, isAttacking } from "../../../Models/Unit";
import { TURN_DURATION } from "../../../config";
import BattlegroundScene from "../BattlegroundScene";


export function init(scene: BattlegroundScene, state: State) {

	let displayIndex: {
		[key: string]:
		{
			targetId: string,
			graphic: Phaser.GameObjects.Graphics,
		}
	} = {}

	listeners([
		[events.UNITS_SELECTED, (ids: string[]) => {

			ids.forEach(squadId => {
				const squad = scene.getSquad(squadId);
				if (isAttacking(squad.status)) {
					const job = getJob(squad.job);
					if (job.attackType !== "ranged") return;

					const line = drawLine(scene, squad, squad.status.target, state.options.speed);
					displayIndex[squadId] = {
						targetId: squad.status.target,
						graphic: line
					}
				}
			});

		}],
		[events.ATTACK_STARTED, (attacker: string, target: string) => {

			const state = getState()

			if (!state.gameData.selectedUnits.includes(attacker)) return

			const squad = scene.getSquad(attacker)

			const job = getJob(squad.job)
			if (job.attackType !== "ranged") return

			const line = drawLine(scene, squad, target, state.options.speed)

			displayIndex[attacker] = {
				targetId: target,
				graphic: line
			}
		}
		],
		[events.UNITS_DESELECTED, (ids: string[]) => {

			ids.forEach(id => {

				const line = displayIndex[id]

				if (line) {
					line.graphic.destroy()
					delete displayIndex[id]
				}

			})
		}],
		[events.SQUAD_DESTROYED, (id: string) => {

			const line = displayIndex[id]

			if (line) {
				line.graphic.destroy()
				delete displayIndex[id]
			}

		}],
		[events.SQUAD_DESTROYED, (id: string) => {

			// TODO: this could be a problem if the attacker changes its status before the target is destroyed

			Object.entries(displayIndex).forEach(([key, value]) => {

				if (value.targetId === id) {
					value.graphic.destroy()
					delete displayIndex[key]
				}
			})
		}],
		[events.SQUAD_LEAVES_CELL, (squadId: string, vec: Vec2) => {

			Object.entries(displayIndex).forEach(([key, value]) => {

				if (value.targetId === squadId) {
					value.graphic.destroy()
					delete displayIndex[key]
				}
				// TODO: check if new cell is in range

			});

		}]
	])

}

function drawLine(scene: BattlegroundScene, squad: Unit, targetId: string, speed: number) {

	const source = scene.getChara(squad.id)
	const target = scene.getChara(targetId)

	const graphics = scene.add.graphics()

	const distance = Phaser.Math.Distance.Between(source.sprite.x, source.sprite.y, target.sprite.x, target.sprite.y)

	const points = Phaser.Geom.Line.BresenhamPoints(
		new Phaser.Geom.Line(source.sprite.x, source.sprite.y, target.sprite.x, target.sprite.y),
		// number of steps varies with distance
		Math.ceil(distance / 10)
	)

	graphics.lineStyle(1, 0x00ff00, 1)

	points.forEach((point, i) => {

		scene.time.addEvent({
			delay: 20 * i,
			callback: () => {

				if (graphics.active && point.x && point.y) {

					graphics.lineStyle(4, 0xff0000, 0.8)
					graphics.beginPath()
					graphics.moveTo(source.sprite.x, source.sprite.y)
					graphics.lineTo(point.x, point.y)
					graphics.closePath()
					graphics.strokePath()

				}
			}
		})
	})

	return graphics

}