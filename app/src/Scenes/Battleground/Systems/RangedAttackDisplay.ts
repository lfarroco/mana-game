import { getJob } from "../../../Models/Job";
import { events, listeners } from "../../../Models/Signals";
import { getState } from "../../../Models/State";
import { UNIT_STATUS_KEYS, Unit } from "../../../Models/Unit";
import BattlegroundScene from "../BattlegroundScene";


export function init(scene: BattlegroundScene) {

	let displayIndex: { [key: string]: Phaser.GameObjects.Graphics } = {}

	listeners([
		[events.UNITS_SELECTED, (ids: string[]) => {

			ids.forEach(squadId => {
				const squad = scene.getSquad(squadId);
				if (squad.status.type === UNIT_STATUS_KEYS.ATTACKING) {
					const job = getJob(squad.job);
					if (job.attackType !== "ranged") return;

					//@ts-ignore
					const target = squad.status.target
					if (target) {
						const line = drawLine(scene, squad, target);
						displayIndex[squadId] = line;
					}
				}
			});

		}], [
			events.ATTACK_STARTED, (attacker: string, target: string) => {

				const state = getState()

				if (!state.gameData.selectedUnits.includes(attacker)) return

				const squad = scene.getSquad(attacker)

				const job = getJob(squad.job)
				if (job.attackType !== "ranged") return

				const line = drawLine(scene, squad, target)

				displayIndex[attacker] = line
			}
		],
		[events.UNITS_DESELECTED, (ids: string[]) => {

			ids.forEach(id => {

				const line = displayIndex[id]

				if (line) {
					line.destroy()
					delete displayIndex[id]
				}

			})
		}],
		[events.SQUAD_DESTROYED, (id: string) => {

			const line = displayIndex[id]

			if (line) {
				line.destroy()
				delete displayIndex[id]
			}

		}],
		[
			events.SQUAD_DESTROYED, (id: string) => {

				// is it the target of someone?

				const state = getState()

				state.gameData.squads.forEach(squad => {

					// @ts-ignore
					if (squad.status.target === id) {

						const line = displayIndex[squad.id]

						if (line) {
							line.destroy()
							delete displayIndex[squad.id]
						}

					}

				})

			}
		]
	])

}

function drawLine(scene: BattlegroundScene, squad: Unit, targetId: string) {

	const source = scene.getChara(squad.id)
	const target = scene.getChara(targetId)

	const graphics = scene.add.graphics()
	//TODO:  if we animate the line, we can make it look like a projectile
	graphics.lineStyle(4, 0xff0000, 0.8)
	graphics.beginPath()
	graphics.moveTo(source.sprite.x, source.sprite.y)
	graphics.lineTo(target.sprite.x, target.sprite.y)
	graphics.closePath()
	graphics.strokePath()


	return graphics

}