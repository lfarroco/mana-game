import { CombatEnvironment, Unit } from "../../Models";
import { applyPersistentPowerDelta } from "./applyPersistentPowerDelta";

export const increasePower = (
  env: CombatEnvironment,
  targets: Unit[],
  amount: number,
  permanent: boolean,
  sourceUnit?: Unit,
) => {
  for (const target of targets) {
    applyPersistentPowerDelta(env, target, amount, permanent);

    env.logger.log({
      type: "increase_power",
      sourceId: sourceUnit?.id,
      targetId: target.id,
      amount: amount,
      permanent: permanent,
    });
  }
};
