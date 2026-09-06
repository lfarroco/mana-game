import { CombatEnvironment, Unit } from "../../Models";
import { applyPersistentPowerDelta } from "./applyPersistentPowerDelta";

export const decreasePower = (
  env: CombatEnvironment,
  targets: Unit[],
  amount: number,
  permanent: boolean,
  sourceUnit: Unit | undefined,
) => {
  for (const target of targets) {
    // Log the APPLIED magnitude, not the requested one: power clamps at 0
    // (applyPowerDelta), so an overkill decrease would otherwise replay
    // deeper on the client than the simulation went (client/server desync
    // with negative client power — the old "below 0 power" bug).
    const appliedDelta = applyPersistentPowerDelta(
      env,
      target,
      -amount,
      permanent,
    );

    env.logger.log({
      type: "decrease_power",
      sourceId: sourceUnit?.id,
      targetId: target.id,
      amount: -appliedDelta,
      permanent: permanent,
      affectedUnitId: target.id,
    });
  }
};
