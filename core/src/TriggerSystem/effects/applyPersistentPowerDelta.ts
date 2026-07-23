import { applyPowerDelta } from "../../Entities/Unit";
import { CombatEnvironment, Unit } from "../../Models";
import { FORCE_ID_PLAYER } from "../../Constants";

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

	// Permanent power deltas are applied to the persistent unit reference in
	// combatState.units so changes survive combat boundaries and are carried
	// back to the session as finalPlayerUnits.
	// Only player-force units receive permanent deltas since enemy units
	// are ephemeral (re-generated each combat).
	const persistentUnit = env.combatState.units.find((unit) => unit.id === targetUnit.id);
	if (persistentUnit && persistentUnit !== targetUnit) {
		applyPowerDelta(persistentUnit, appliedDelta, permanent);
	}

	return appliedDelta;
};
