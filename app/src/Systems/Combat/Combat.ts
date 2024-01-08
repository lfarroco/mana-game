import { boardVec } from "../../Models/Misc";
import { listeners, events, emit, Operation, operations } from "../../Models/Signals";
import { SQUAD_STATUS, Squad } from "../../Models/Squad";
import { State } from "../../Models/State";
import { moraleDamage } from "./moraleDamage";
import { staminaDamage } from "./staminaDamage";
import { Engagement } from "../Engagement/Engagement";

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


export function processCombat(state: State): Operation[] {

	return state.engagements
		.filter(e => !e.finished)
		.reduce((ops, engagement) => {

			const attacker = state.squads.find(s => s.id === engagement.attacker);
			const defender = state.squads.find(s => s.id === engagement.defender);

			if (!attacker || !defender) {
				throw new Error(`Squad ${engagement.attacker} or ${engagement.defender} not found`)
			}

			const staminaResult = staminaDamage(attacker, defender);

			const moraleResult = moraleDamage(attacker, defender);

			return ops
				.concat(staminaResult.operations)
				.concat(moraleResult.operations)
				.concat(
					compareResults(staminaResult, moraleResult, engagement, attacker, defender, state)
				)

		}, [] as Operation[])
}

function compareResults(
	staminaResult: { operations: Operation[]; attackerDamage: number; defenderDamage: number; newAttackerStamina: number; newDefenderStamina: number; },
	moraleResult: { operations: Operation[]; attackerDamage: number; defenderDamage: number; newAttackerMorale: number; newDefenderMorale: number; },
	engagement: Engagement,
	attacker: Squad,
	defender: Squad,
	state: State): Operation[] {
	if ([
		staminaResult.newAttackerStamina,
		staminaResult.newDefenderStamina,
		moraleResult.newAttackerMorale,
		moraleResult.newDefenderMorale
	].some(n => n <= 0)) {

		const combatFinished = [operations.FINISH_ENGAGEMENT(engagement.id)]

		const successfullAttack =
			moraleResult.newAttackerMorale > 0 && staminaResult.newAttackerStamina > 0 ?
				[operations.UPDATE_SQUAD(attacker.id, { status: SQUAD_STATUS.MOVING })] :
				[]

		const failedAttack =
			moraleResult.newAttackerMorale <= 0 && staminaResult.newAttackerStamina > 0 ?
				[
					operations.UPDATE_SQUAD(attacker.id, { status: SQUAD_STATUS.IDLE }),
					operations.UPDATE_SQUAD(attacker.id, { path: [] })
				] :
				[]

		const successfullDefense =
			moraleResult.newDefenderMorale > 0 && staminaResult.newDefenderStamina > 0 ?
				[operations.UPDATE_SQUAD(defender.id, {
					status: defender.path.length > 0 ?
						SQUAD_STATUS.MOVING :
						SQUAD_STATUS.IDLE
				})] :
				[]

		const failedDefense = moraleResult.newDefenderMorale <= 0 && staminaResult.newDefenderStamina > 0 ?
			moraleResult.newAttackerMorale > 0 && staminaResult.newAttackerStamina > 0 ?
				tryRetreating(defender, state) :
				[
					operations.UPDATE_SQUAD(defender.id, { status: SQUAD_STATUS.IDLE }),
					operations.UPDATE_SQUAD(defender.id, { path: [] }),
				]
			: []

		return combatFinished
			.concat(successfullAttack)
			.concat(failedAttack)
			.concat(successfullDefense)
			.concat(failedDefense)

	} else {
		return []
	}
}

function tryRetreating(squad: Squad, state: State) {

	const retreat: Operation = operations.UPDATE_SQUAD(
		squad.id,
		{ status: SQUAD_STATUS.RETREATING }
	)

	const pathToNeighborAlly = state.squads
		.filter(sqd => sqd.force === squad.force)
		.map(sqd => sqd.position)
		.filter(pos => {
			const distance = Math.abs(pos.x - squad.position.x) + Math.abs(pos.y - squad.position.y);
			return distance === 1;
		});

	const movement = pathToNeighborAlly.length > 0 ?
		operations.UPDATE_SQUAD(squad.id, { path: pathToNeighborAlly }) :
		getRandomEmptyCell(squad, state);

	return [retreat, movement];
}

function getRandomEmptyCell(squad: Squad, state: State): Operation {
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
		return operations.UPDATE_SQUAD(squad.id, { path: [boardVec(squad.position.x + x, squad.position.y + y)] })
	} else {
		return operations.SQUAD_DESTROYED(squad.id)
	}
}

