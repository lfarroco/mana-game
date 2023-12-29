import { FORCE_ID_PLAYER } from "../../Models/Force";
import { listeners, events, emit } from "../../Models/Signals";
import { SQUAD_STATUS, Squad } from "../../Models/Squad";
import { State } from "../../Models/State";

export function init(state: State) {

	listeners([
		[events.BATTLEGROUND_TICK, () => { processCombat(state); }]
	])

}

export function processCombat(state: State) {
	state.engagements.forEach(engagement => {

		if (engagement.finished) return

		const attacker = state.squads.find(s => s.id === engagement.attacker);
		const defender = state.squads.find(s => s.id === engagement.defender);

		if (!attacker || !defender) {
			throw new Error(`Squad ${engagement.attacker} or ${engagement.defender} not found`)
		}

		[attacker, defender].forEach(squad => {

			const randmD6Roll = Math.floor(Math.random() * 6) + 1 + (squad.force === FORCE_ID_PLAYER ? 0 : 10)

			const newStamina = squad.stamina - (randmD6Roll / 2);

			if (newStamina <= 0) {
				emit(events.UPDATE_SQUAD_STAMINA, squad.id, 0)
				engagement.finished = true;
			} else {
				emit(events.UPDATE_SQUAD_STAMINA, squad.id, newStamina)
			}

			const newMorale = squad.morale - (randmD6Roll);

			if (newMorale <= 0) {
				emit(events.UPDATE_SQUAD_MORALE, squad.id, 0)

				if (squad.id === attacker.id && newStamina > 0) {
					console.log(`${squad.id} failed attack`)
					squad.status = SQUAD_STATUS.IDLE;
					squad.path = [];
					engagement.log = [...engagement.log, `${squad.name} failed attack`]
				} else if (newStamina > 0) {
					console.log(`${squad.id} retreated`)
					engagement.log = [...engagement.log, `${squad.name} retreated`]
					tryRetreating(squad, state);
				}

				engagement.finished = true;
			} else {

				emit(events.UPDATE_SQUAD_MORALE, squad.id, newMorale)
			}


			engagement.log = [...engagement.log, `tick: ${state.tick} | ${squad.name} morale: ${newMorale}, stamina: ${newStamina}`]
		})

		if (engagement.finished) {
			[attacker, defender]
				.filter(s => s.status !== SQUAD_STATUS.DESTROYED && s.status !== SQUAD_STATUS.RETREATING)
				.forEach(squad => {

					console.log(">>>", squad.id, squad.status)

					if (squad.path.length > 0) {
						squad.status = SQUAD_STATUS.MOVING
					} else {
						squad.status = SQUAD_STATUS.IDLE
					}
				})

			engagement.sprite.destroy()
		}
	})

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
			if (squad.position.x + x < 0 || squad.position.x + x >= state.map.width) return false;
			if (squad.position.y + y < 0 || squad.position.y + y >= state.map.height) return false;

			const cell = state.squads.find(sqd => sqd.position.x === squad.position.x + x && sqd.position.y === squad.position.y + y);
			return !cell;
		});
		if (emptyCells.length > 0) {
			const [x, y] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
			squad.path = [{ x: squad.position.x + x, y: squad.position.y + y }];
		} else {
			emit(events.SQUAD_DESTROYED, squad.id)
		}
	}
}
