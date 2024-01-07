import { events, Operation } from "../../Models/Signals";
import { Squad } from "../../Models/Squad";
import { diceRoll } from "../../Utils/diceRoll";

export function moraleDamage(attacker: Squad, defender: Squad) {

	const attackerDamage = diceRoll(8);
	const defenderDamage = diceRoll(12);

	const newAttackerMorale = attacker.morale - defenderDamage;
	const newDefenderMorale = defender.morale - attackerDamage;

	const calcAttackerMorale = (): Operation => {
		if (newAttackerMorale <= 0) {
			return [events.UPDATE_SQUAD, attacker.id, { morale: 0 }]
		} else {
			return [events.UPDATE_SQUAD, attacker.id, { morale: newAttackerMorale }]
		}
	}
	const calcDefenderMorale = (): Operation => {

		if (newDefenderMorale <= 0) {
			return [events.UPDATE_SQUAD, defender.id, { morale: 0 }]
		} else {
			return [events.UPDATE_SQUAD, defender.id, { morale: newDefenderMorale }]
		}
	}

	const operations = (
		[] as Operation[]
	).concat(
		[calcAttackerMorale()]
	).concat(
		[calcDefenderMorale()]
	)

	return {
		operations,
		attackerDamage,
		defenderDamage,
		newAttackerMorale,
		newDefenderMorale
	};
}
