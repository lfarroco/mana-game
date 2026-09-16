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

  // Log the distributor's own loss with the APPLIED magnitude (power clamps at
  // 0). Without this entry the client never updated the source unit's power
  // chip: playback replays the log stream onto a fresh combat state, so a
  // simulated delta with no log is invisible on screen. Players saw it on
  // Walking Reactor — "its power still shows the starting value however many
  // times distribute_power halves it".
  const appliedDecrease = applyPersistentPowerDelta(
    env,
    sourceUnit,
    -powerToDistribute,
    permanent,
  );
  env.logger.log({
    type: "decrease_power",
    sourceId: sourceUnit.id,
    targetId: sourceUnit.id,
    // Normalise `-0` to `0` (JSON round-trip equality; see decreasePower).
    amount: appliedDecrease === 0 ? 0 : -appliedDecrease,
    permanent,
    affectedUnitId: sourceUnit.id,
  });

  const powerPerTarget = Math.floor(powerToDistribute / targets.length);

  increasePower(env, targets, powerPerTarget, permanent, sourceUnit);
};
