import { Unit } from "@Models/Entities/Unit";
import { increasePower } from "./increasePower";
import { FORCE_ID_PLAYER } from "@Constants/constants";
import { CombatEnvironment } from "@Scenes/Battleground/CombatEnvironment";

export const distributePower = (env: CombatEnvironment, sourceUnit: Unit, targets: Unit[], permanent: boolean, delayedExecution?: number) => {
	if (targets.length === 0) return;

	const { state } = env;
	const powerToDistribute = Math.floor(sourceUnit.power * 0.5);
	if (powerToDistribute <= 0) return;

	sourceUnit.power = Math.max(0, sourceUnit.power - powerToDistribute);

	const bonusToLose = Math.max(0, Math.min(sourceUnit.bonusPower, powerToDistribute));
	sourceUnit.bonusPower -= bonusToLose;

	if (sourceUnit.force === FORCE_ID_PLAYER) {
		const playerUnit = state.gameData.player.units.find((u) => u.id === sourceUnit.id);
		if (playerUnit && playerUnit !== sourceUnit) {
			playerUnit.bonusPower = Math.max(0, playerUnit.bonusPower - bonusToLose);
			playerUnit.power = Math.max(0, playerUnit.power - bonusToLose);
		}
	}

	const powerPerTarget = Math.floor(powerToDistribute / targets.length);

	increasePower(env, targets, powerPerTarget, permanent, sourceUnit, delayedExecution);

	const effects = env.effects;
	if (effects.onPowerUpdate) {
		effects.onPowerUpdate(sourceUnit.id);
	}
};
