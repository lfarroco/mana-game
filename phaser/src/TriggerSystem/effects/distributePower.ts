import { applyPowerDelta, Unit } from "@Models/Entities/Unit";
import { increasePower } from "@TriggerSystem/effects/increasePower";
import { FORCE_ID_PLAYER } from "@Constants/constants";
import { CombatEnvironment } from "@Scenes/Battleground/CombatEnvironment";

export const distributePower = (
	env: CombatEnvironment,
	sourceUnit: Unit,
	targets: Unit[],
	permanent: boolean,
	delayedExecution?: number
) => {
	if (targets.length === 0) return;

	const { state } = env;
	const powerToDistribute = Math.floor(sourceUnit.power * 0.5);
	if (powerToDistribute <= 0) return;

	const sourceDelta = applyPowerDelta(sourceUnit, -powerToDistribute, permanent);

	if (sourceUnit.force === FORCE_ID_PLAYER && permanent) {
		const playerUnit = state.session.team.units.find((u) => u.id === sourceUnit.id);
		if (playerUnit && playerUnit !== sourceUnit) {
			applyPowerDelta(playerUnit, sourceDelta, permanent);
		}
	}

	const powerPerTarget = Math.floor(powerToDistribute / targets.length);

	increasePower(env, targets, powerPerTarget, permanent, sourceUnit, delayedExecution);

	const effects = env.effects;
	if (effects.onPowerUpdate) {
		effects.onPowerUpdate(sourceUnit.id);
	}
};
