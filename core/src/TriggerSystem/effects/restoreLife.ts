import * as Card from "../../Entities/Card";
import * as Force from "../../Entities/Force";
import * as CombatStatsTracker from "../../Combat/CombatStatsTracker";
import * as PoisonSystem from "../../Combat/PoisonDamageSystem";
import { calculateCritical } from "../../Entities/Unit";
import { CombatEnvironment, Unit } from "../../Models";
import { processReactions } from "../TriggerSystem";

const PROJECTILE_TRAVEL_MS = 200;

export const restoreLife = (
  env: CombatEnvironment,
  sourceUnit: Unit,
  scale: number = 1,
  isReaction: boolean = false,
) => {
  const baseAmount = sourceUnit.power;
  const crit = calculateCritical(env, sourceUnit);
  env.seed = crit.seed;
  const healAmount = (baseAmount + crit.bonusPower) * crit.multiplier * scale;
  const alliedCore = Card.getBattleCore(env.combatState)(sourceUnit.force);

  // Log the cast
  env.logger.log({
    type: "heal_cast",
    sourceId: sourceUnit.id,
    targetId: alliedCore.id,
    amount: healAmount,
    travelTime: PROJECTILE_TRAVEL_MS,
  });

  // Schedule the hit as a deferred event
  const currentTimeMs = env.logger.getCurrentTimeMs();
  const sourceId = sourceUnit.id;
  const targetId = alliedCore.id;
  const isCritical = crit.isCritical;

  env.deferredEvents.push({
    timeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
    execute: (env) => {
      const { combatState: state, combatStates } = env;
      const sourceUnit = state.units.find((u) => u.id === sourceId);
      if (!sourceUnit) return;

      const sourceForce = Force.getUnitForce(state, sourceId);

      const alliedCore = Card.getBattleCore(env.combatState)(sourceUnit.force);
      const oldLife = alliedCore.life;

      const actualHealing = Force.manipulateCoreLife(
        state,
        sourceForce,
        healAmount,
        isCritical,
      );

      // "Can't react to reactions" (see TriggerSystem.ts): an effect that was
      // itself a reaction emits no reaction triggers and contributes no
      // force/unit stats — reaction-sourced heals never fire on_crit or
      // on_over_heal and never feed the every_100_heal threshold.
      if (!isReaction) {
        CombatStatsTracker.trackHeal(
          combatStates.combatStatsTrackerState,
          sourceUnit,
          actualHealing,
        );
      }

      const newPoisonState = PoisonSystem.reducePoison(
        combatStates.poisonSystemState,
        sourceForce,
        actualHealing,
      );
      combatStates.poisonSystemState = newPoisonState;

      if (isCritical && !isReaction) {
        processReactions(env, sourceUnit, { id: "on_crit" }, 1);
      }

      // Check overheal at hit time, not cast time — the core's life may
      // have changed during the 200 ms projectile travel.
      const willOverheal = actualHealing < healAmount;
      if (willOverheal && !isReaction) {
        processReactions(env, sourceUnit, { id: "on_over_heal" }, 1);
      }

      const poisonRate = PoisonSystem.getPoisonRate(
        combatStates.poisonSystemState,
        sourceForce,
      );

      env.logger.log({
        type: "heal_hit",
        sourceId: sourceId,
        targetId: targetId,
        amount: healAmount,
        newLife: alliedCore.life,
        newPoison: poisonRate,
        lifeDelta: alliedCore.life - oldLife,
      });
    },
  });
};
