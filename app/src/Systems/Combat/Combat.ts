import { FORCE_ID_PLAYER } from "../../Models/Force";
import { listeners, events, emit } from "../../Models/Signals";
import { State } from "../../Models/State";

export function init(state: State) {

	listeners([
		[events.BATTLEGROUND_TICK, () => { processCombat(state); }]
	])

}

export function processCombat(state: State) {
	state.engagements.forEach(engagement => {
		engagement.members.forEach(member => {

			const squad = state.squads.find(squad => squad.id === member.id);
			if (!squad) {
				throw new Error(`Squad ${member.id} not found`)
			}

			const isAtacking = squad.position.x === engagement.attackingCell.x && squad.position.y === engagement.attackingCell.y

			const randmD6Roll = Math.floor(Math.random() * 6) + 1

			const newMorale = squad.morale - (randmD6Roll);

			if (newMorale <= 0) {
				emit(events.UPDATE_SQUAD_MORALE, squad.id, 0)
				squad.engaged = false
				if (!isAtacking) {
					squad.isRetreating = true
					// find a path to a neighboring friendly cell, if any
					const closestCell = state.squads
						.filter(sqd => sqd.force === squad.force)
						.map(sqd => sqd.position)
						.filter(pos => {
							const distance = Math.abs(pos.x - squad.position.x) + Math.abs(pos.y - squad.position.y)
							return distance === 1
						})

					if (closestCell.length > 0) {
						squad.path = closestCell
					} else {
						// pick empty random cell
						const emptyCells = [
							[0, 1],
							[0, -1],
							[1, 0],
							[-1, 0],
						].filter(([x, y]) => {
							const cell = state.squads.find(sqd => sqd.position.x === squad.position.x + x && sqd.position.y === squad.position.y + y)
							return !cell
						})
						if (emptyCells.length > 0) {
							const [x, y] = emptyCells[Math.floor(Math.random() * emptyCells.length)]
							squad.path = [{ x: squad.position.x + x, y: squad.position.y + y }]
						} else {
							// nowhere to retreat
							// TODO: destroy squad
						}
					}
				} else {
					squad.path = []
				}

				// remove this member from the engagement
				engagement.members = engagement.members.filter(m => m.id !== member.id)
			} else {

				emit(events.UPDATE_SQUAD_MORALE, squad.id, newMorale)

			}

		})

		const onlyOneForceRemains = engagement.members.every(member => member.force === engagement.members[0].force)

		if (onlyOneForceRemains) {

			engagement.members.forEach(member => {
				const squad = state.squads.find(squad => squad.id === member.id)
				if (!squad) {
					throw new Error(`Squad ${member.id} not found`)
				}
				squad.engaged = false

			})

			engagement.sprite.destroy()

			state.engagements = state.engagements.filter(engagement => engagement.members.length > 1)
		}

	})

}