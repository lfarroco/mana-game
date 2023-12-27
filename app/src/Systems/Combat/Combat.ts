import { removeEmote } from "../../Components/chara";
import { faceDirection, getDirection } from "../../Models/Direction";
import { FORCE_ID_PLAYER } from "../../Models/Force";
import { listeners, events, emit } from "../../Models/Signals";
import { SQUAD_STATUS, Squad } from "../../Models/Squad";
import { State } from "../../Models/State";
import { Engagement } from "../Engagement/Engagement";

export function init(state: State) {

	listeners([
		[events.BATTLEGROUND_TICK, () => { processCombat(state); }]
	])

}

export function processCombat(state: State) {
	state.engagements.forEach(engagement => {

		if (engagement.finished) return

		engagement.members.forEach(member => {

			const squad = state.squads.find(squad => squad.id === member.id);
			if (!squad) {
				throw new Error(`Squad ${member.id} not found`)
			}

			const isAtacking = squad.position.x === engagement.attackingCell.x && squad.position.y === engagement.attackingCell.y

			const randmD6Roll = Math.floor(Math.random() * 6) + 1 + (squad.force === FORCE_ID_PLAYER ? 0 : 10)

			const newMorale = squad.morale - (randmD6Roll);

			if (newMorale <= 0) {
				emit(events.UPDATE_SQUAD_MORALE, squad.id, 0)
				if (isAtacking) {
					squad.status = SQUAD_STATUS.IDLE;
					squad.path = [];
				} else {
					tryRetreating(squad, state);
				}

				removeEngagementMember(engagement, member);
			} else {

				emit(events.UPDATE_SQUAD_MORALE, squad.id, newMorale)
			}

			const newStamina = squad.stamina - (randmD6Roll / 2);

			if (newStamina <= 0) {
				emit(events.UPDATE_SQUAD_STAMINA, squad.id, 0)
			} else {
				emit(events.UPDATE_SQUAD_STAMINA, squad.id, newStamina)
			}
		})

		const onlyOneForceRemains = engagement.members.every(member => member.force === engagement.members[0].force)

		if (onlyOneForceRemains) {

			engagement.members.forEach(member => {
				const squad = state.squads.find(squad => squad.id === member.id)
				if (!squad) {
					throw new Error(`Squad ${member.id} not found`)
				}
				if (squad.path.length > 0) {
					squad.status = SQUAD_STATUS.MOVING
				} else {
					squad.status = SQUAD_STATUS.IDLE
				}
			})

			engagement.sprite.destroy()
			engagement.finished = onlyOneForceRemains
		}
	})

}

function removeEngagementMember(engagement: Engagement, member: { id: string; force: string; cell: { x: number; y: number; }; }) {
	engagement.members = engagement.members.filter(m => m.id !== member.id);
}

function tryRetreating(squad: Squad, state: State) {
	squad.status = SQUAD_STATUS.RETREATING;
	// find a path to a neighboring friendly cell, if any
	const closestAlliedCell = state.squads
		.filter(sqd => sqd.force === squad.force)
		.map(sqd => sqd.position)
		.filter(pos => {
			const distance = Math.abs(pos.x - squad.position.x) + Math.abs(pos.y - squad.position.y);
			return distance === 1;
		});

	if (closestAlliedCell.length > 0) {
		squad.path = closestAlliedCell;
	} else {
		// pick empty random cell
		const emptyCells = [
			[0, 1],
			[0, -1],
			[1, 0],
			[-1, 0],
		].filter(([x, y]) => {
			const cell = state.squads.find(sqd => sqd.position.x === squad.position.x + x && sqd.position.y === squad.position.y + y);
			return !cell;
		});
		if (emptyCells.length > 0) {
			const [x, y] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
			squad.path = [{ x: squad.position.x + x, y: squad.position.y + y }];
		} else {
			// nowhere to retreat
			// TODO: destroy squad
		}
	}
}
