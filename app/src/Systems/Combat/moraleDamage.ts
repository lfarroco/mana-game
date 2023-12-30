import { events, Operation } from "../../Models/Signals";
import { Squad } from "../../Models/Squad";
import { diceRoll } from "../../Utils/diceRoll";

export function moraleDamage(attacker: Squad, defender: Squad, operations: Operation[]) {

	const attackerDamage = diceRoll(20);
	const defenderDamage = diceRoll(6);

	const newAttackerMorale = attacker.morale - defenderDamage;
	const newDefenderMorale = defender.morale - attackerDamage;

	if (newAttackerMorale <= 0) {
		operations.push([events.UPDATE_SQUAD_MORALE, attacker.id, 0]);
	} else {
		operations.push([events.UPDATE_SQUAD_MORALE, attacker.id, newAttackerMorale]);
	}

	if (newDefenderMorale <= 0) {
		operations.push([events.UPDATE_SQUAD_MORALE, defender.id, 0]);
	} else {
		operations.push([events.UPDATE_SQUAD_MORALE, defender.id, newDefenderMorale]);
	}

	return {
		attackerDamage,
		defenderDamage,
		newAttackerMorale,
		newDefenderMorale
	};
}
