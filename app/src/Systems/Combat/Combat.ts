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
					// TODO: retreat to
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