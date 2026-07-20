import { CombatEnvironment, Unit } from "../../Models";

export const multiplyPower = (options: {
	env: CombatEnvironment;
	targets: Unit[];
	sourceUnit: Unit;
	multiplier: number;
}) => {
	const { targets, multiplier, env } = options;

	for (const target of targets) {
		const currentPower = target.power;
		const newPower = Math.floor(currentPower * multiplier);
		const powerDifference = newPower - currentPower;

		target.power += powerDifference;

		env.logger.log({
			type: "increase_power",
			sourceId: options.sourceUnit.id,
			targetId: target.id,
			amount: powerDifference,
			permanent: false,
		});
	}
};