import { CombatEnvironment, Unit } from "../../Models";
import * as PoisonSystem from "../../Combat/PoisonDamageSystem";
import * as RegenSystem from "../../Combat/RegenSystem";

const PROJECTILE_TRAVEL_MS = 200;

/**
 * D2 (docs/wacky-content-plan.md): strip status effects from a target —
 * poison / regen stacks (force-keyed) and the unit's haste, slow, charge,
 * shield, and silence counters. Ally- or enemy-targetable.
 */
export function applyDispel(
  env: CombatEnvironment,
  sourceUnit: Unit,
  targets: Unit[],
) {
  for (const target of targets) {
    // Log the cast
    env.logger.log({
      type: "dispel_cast",
      sourceId: sourceUnit.id,
      targetId: target.id,
      travelTime: PROJECTILE_TRAVEL_MS,
    });

    // Schedule the hit as a deferred event
    const currentTimeMs = env.logger.getCurrentTimeMs();
    const targetId = target.id;
    const sourceId = sourceUnit.id;

    env.deferredEvents.push({
      timeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
      execute: (env) => {
        const { combatState: state, combatStates } = env;
        const target = state.units.find((u) => u.id === targetId);
        if (!target) return;

        target.hasted = 0;
        target.slowed = 0;
        target.charge = 0;
        target.shield = 0;
        target.silenced = 0;

        combatStates.poisonSystemState = PoisonSystem.clearPoison(
          combatStates.poisonSystemState,
          target.force,
        );
        combatStates.regenSystemState = RegenSystem.clearRegen(
          combatStates.regenSystemState,
          target.force,
        );

        env.logger.log({
          type: "dispel_hit",
          sourceId: sourceId,
          targetId: targetId,
        });
      },
    });
  }
}
