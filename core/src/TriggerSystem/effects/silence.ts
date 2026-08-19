import { CombatEnvironment, Unit } from "../../Models";

const PROJECTILE_TRAVEL_MS = 200;

/**
 * D1 (docs/wacky-content-plan.md): apply a silence — the target unit wastes its
 * next turns instead of casting (see CombatRunner.chargeUnits). Duration is
 * additive-friendly: re-silencing keeps the longest remaining duration.
 */
export function applySilence(
  env: CombatEnvironment,
  sourceUnit: Unit,
  targets: Unit[],
  duration: number,
) {
  for (const target of targets) {
    // Log the cast
    env.logger.log({
      type: "silence_cast",
      sourceId: sourceUnit.id,
      targetId: target.id,
      effectDuration: duration,
      travelTime: PROJECTILE_TRAVEL_MS,
    });

    // Schedule the hit as a deferred event
    const currentTimeMs = env.logger.getCurrentTimeMs();
    const targetId = target.id;
    const sourceId = sourceUnit.id;

    env.deferredEvents.push({
      timeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
      execute: (env) => {
        const { combatState: state } = env;
        const target = state.units.find((u) => u.id === targetId);
        if (!target) return;

        target.silenced = Math.max(target.silenced, duration);

        env.logger.log({
          type: "silence_hit",
          sourceId: sourceId,
          targetId: targetId,
          effectDuration: duration,
        });
      },
    });
  }
}
