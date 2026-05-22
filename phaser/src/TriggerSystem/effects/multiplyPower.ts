import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "Client/Scenes/Battleground/CombatEnvironment";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("multiplyPower");

export const multiplyPower = async (options: {
	env: CombatEnvironment;
	targets: Unit[];
	sourceUnit: Unit;
	multiplier: number;
	delayedExecution?: number;
}) => {
	const { targets, multiplier, env } = options;

	const effects = env.effects;

	for (const target of targets) {
		logger.debug(`Multiplying power of ${target.id} by ${multiplier}`);
		const currentPower = target.power;
		const newPower = Math.floor(currentPower * multiplier);
		const powerDifference = newPower - currentPower;

		target.power += powerDifference;

		if (effects.onPowerUpdate) {
			effects.onPowerUpdate(target.id);
		}
	}
};
