import { FORCE_ID_PLAYER } from "@Constants/constants";
import { applyPowerDelta, Unit } from "@Models/Entities/Unit";
import { CombatEnvironment } from "@Scenes/Battleground/CombatEnvironment";

export const applyPersistentPowerDelta = (
	env: CombatEnvironment,
	targetUnit: Unit,
	delta: number,
	permanent: boolean
): number => {
	const appliedDelta = applyPowerDelta(targetUnit, delta, permanent);

	if (!permanent || targetUnit.force !== FORCE_ID_PLAYER) {
		return appliedDelta;
	}

	const persistentUnit = env.state.session.team.units.find((unit) => unit.id === targetUnit.id);
	if (persistentUnit && persistentUnit !== targetUnit) {
		applyPowerDelta(persistentUnit, appliedDelta, permanent);
	}

	return appliedDelta;
};
