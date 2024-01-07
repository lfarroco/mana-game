import { Operation, operations } from "../../Models/Signals";
import { Squad } from "../../Models/Squad";
import { diceRoll } from "../../Utils/diceRoll";

export function staminaDamage(attacker: Squad, defender: Squad) {

	const attackerDamage = diceRoll(3);
	const defenderDamage = diceRoll(3);

	const newAttackerStamina = attacker.stamina - Math.ceil((defenderDamage));
	const newDefenderStamina = defender.stamina - Math.ceil((attackerDamage));

	const ops = ([] as Operation[]).concat(
		newAttackerStamina <= 0 ?
			[operations.UPDATE_SQUAD(attacker.id, { stamina: 0 })] :
			[operations.UPDATE_SQUAD(attacker.id, { stamina: newAttackerStamina })]
	).concat(
		newDefenderStamina <= 0 ?
			[operations.UPDATE_SQUAD(defender.id, { stamina: 0 })] :
			[operations.UPDATE_SQUAD(defender.id, { stamina: newDefenderStamina })]
	)

	return {
		operations: ops,
		attackerDamage,
		defenderDamage,
		newAttackerStamina,
		newDefenderStamina
	};
}
