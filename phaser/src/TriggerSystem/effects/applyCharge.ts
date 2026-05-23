import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "Client/Screens/Battleground/CombatEnvironment";

export function applyChargeLogicIO(
	env: CombatEnvironment,
	sourceUnit: Unit,
	targets: Unit[],
	amount: number,
	delayedExecution?: number
) {
	const effects = env.effects;

	for (const target of targets) {
		const effect = () => {
			target.charge += amount;
		};

		if (effects.onCharge) {
			effects.onCharge(sourceUnit.id, target.id, amount, effect, delayedExecution);
		} else {
			effect();
		}
	}
}
