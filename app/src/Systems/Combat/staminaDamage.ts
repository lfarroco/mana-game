import { events, Operation } from "../../Models/Signals";
import { Squad } from "../../Models/Squad";
import { diceRoll } from "../../Utils/diceRoll";

export function staminaDamage(attacker: Squad, defender: Squad, operations: Operation[]) {

	const attackerDamage = diceRoll(6);
	const defenderDamage = diceRoll(6);

	const newAttackerStamina = attacker.stamina - Math.ceil((defenderDamage));
	const newDefenderStamina = defender.stamina - Math.ceil((attackerDamage));

	if (newAttackerStamina <= 0) {
		operations.push([events.UPDATE_SQUAD_STAMINA, attacker.id, 0]);
	} else {
		operations.push([events.UPDATE_SQUAD_STAMINA, attacker.id, newAttackerStamina]);
	}

	if (newDefenderStamina <= 0) {
		operations.push([events.UPDATE_SQUAD_STAMINA, defender.id, 0]);
	} else {
		operations.push([events.UPDATE_SQUAD_STAMINA, defender.id, newDefenderStamina]);
	}

	return {
		attackerDamage,
		defenderDamage,
		newAttackerStamina,
		newDefenderStamina
	};
}
