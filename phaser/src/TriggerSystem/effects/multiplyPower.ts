import { Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("multiplyPower");

export const multiplyPower = async (options: {
	env: CombatEnvironment;
	targets: Unit[];
	sourceUnit: Unit;
	multiplier: number;
}) => {
	const { targets, multiplier, env } = options;

	for (const target of targets) {
		logger.debug(`Multiplying power of ${target.id} by ${multiplier}`);
		const currentPower = target.power;
		const newPower = Math.floor(currentPower * multiplier);
		const powerDifference = newPower - currentPower;

		target.power += powerDifference;

		// Log the event for playback (pure data, no callback)
		env.logger.log({
			type: "increase_power",
			sourceId: options.sourceUnit.id,
			targetId: target.id,
			amount: powerDifference,
			permanent: false,
			duration: 0,
		});
	}
};