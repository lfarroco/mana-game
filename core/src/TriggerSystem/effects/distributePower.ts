import { CombatEnvironment, Unit } from "../../Models";
import { increasePower } from "./increasePower";
import { applyPersistentPowerDelta } from "./applyPersistentPowerDelta";

export const distributePower = (
  env: CombatEnvironment,
  sourceUnit: Unit,
  targets: Unit[],
  permanent: boolean,
) => {
  if (targets.length === 0) return;

  const powerToDistribute = Math.floor(sourceUnit.power * 0.5);
  if (powerToDistribute <= 0) return;

  applyPersistentPowerDelta(env, sourceUnit, -powerToDistribute, permanent);

  const powerPerTarget = Math.floor(powerToDistribute / targets.length);

  increasePower(env, targets, powerPerTarget, permanent, sourceUnit);
};
