import { boardVec } from "../../Models/Misc";
import { listeners, events, emit, Operation } from "../../Models/Signals";
import { SQUAD_STATUS, Squad } from "../../Models/Squad";
import { State } from "../../Models/State";
import { moraleDamage } from "./moraleDamage";
import { staminaDamage } from "./staminaDamage";

export function init(state: State) {

	listeners([
		[events.BATTLEGROUND_TICK, () => {
			const events = processCombat(state);

			events.forEach(([event, ...args]) => {
				emit(event, ...args)
			});
		}]
	])

}


export function processCombat(state: State) {

	const operations: Operation[] = [];

	state.engagements
		.filter(e => !e.finished)
		.forEach(engagement => {

			const attacker = state.squads.find(s => s.id === engagement.attacker);
			const defender = state.squads.find(s => s.id === engagement.defender);

			if (!attacker || !defender) {
				throw new Error(`Squad ${engagement.attacker} or ${engagement.defender} not found`)
			}

			const staminaResult = staminaDamage(attacker, defender, operations);

			const moraleResult = moraleDamage(attacker, defender, operations);

			if ([
				staminaResult.newAttackerStamina,
				staminaResult.newDefenderStamina,
				moraleResult.newAttackerMorale,
				moraleResult.newDefenderMorale
			].some(n => n <= 0)) {
				operations.push([events.FINISH_ENGAGEMENT, engagement.id])

				// successfull attack
				if (moraleResult.newAttackerMorale > 0 && staminaResult.newAttackerStamina > 0) {
					operations.push([events.UPDATE_SQUAD_STATUS, attacker.id, SQUAD_STATUS.MOVING])
				}

				// failed attack
				if (moraleResult.newAttackerMorale <= 0 && staminaResult.newAttackerStamina > 0) {
					operations.push([events.UPDATE_SQUAD_STATUS, attacker.id, SQUAD_STATUS.IDLE]);
					operations.push([events.UPDATE_SQUAD_PATH, attacker.id, []]);
				}

				// successfull defense
				if (moraleResult.newDefenderMorale > 0 && staminaResult.newDefenderStamina > 0) {
					operations.push([events.UPDATE_SQUAD_STATUS, defender.id, SQUAD_STATUS.IDLE])
				}

				// failed defense
				if (moraleResult.newDefenderMorale <= 0 && staminaResult.newDefenderStamina > 0) {
					if (moraleResult.newAttackerMorale > 0 && staminaResult.newAttackerStamina > 0) {
						tryRetreating(defender, state, operations);
					} else {
						// both attacker and defender failed
						operations.push([events.UPDATE_SQUAD_STATUS, defender.id, SQUAD_STATUS.IDLE]);
						operations.push([events.UPDATE_SQUAD_PATH, defender.id, []]);
					}
				}

			}

		})

	return operations;
}

function tryRetreating(squad: Squad, state: State, operations: Operation[]) {
	operations.push([events.UPDATE_SQUAD_STATUS, squad.id, SQUAD_STATUS.RETREATING])
	// find a path to a neighboring friendly cell, if any
	const closestAlliedCell = state.squads
		.filter(sqd => sqd.force === squad.force)
		.map(sqd => sqd.position)
		.filter(pos => {
			const distance = Math.abs(pos.x - squad.position.x) + Math.abs(pos.y - squad.position.y);
			return distance === 1;
		});

	if (closestAlliedCell.length > 0) {
		operations.push([events.UPDATE_SQUAD_PATH, squad.id, closestAlliedCell])
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
			operations.push([events.UPDATE_SQUAD_PATH, squad.id, [
				boardVec(squad.position.x + x, squad.position.y + y)
			]])
		} else {
			operations.push([events.SQUAD_DESTROYED, squad.id])
		}
	}
}
