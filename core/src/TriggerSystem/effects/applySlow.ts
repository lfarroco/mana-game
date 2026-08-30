import { CombatEnvironment, Unit } from "../../Models";

const PROJECTILE_TRAVEL_MS = 200;

export function applySlow(
  env: CombatEnvironment,
  sourceUnit: Unit,
  targets: Unit[],
  duration: number,
  onReSlow?: (target: Unit) => void,
  isReaction: boolean = false,
) {
  for (const target of targets) {
    // "Can't react to reactions" (see TriggerSystem.ts): an effect that was
    // itself a reaction emits no reaction triggers — a reaction-sourced slow
    // never fires re_slow, even on an already-slowed target.
    if (target.slowed > 0 && onReSlow && !isReaction) {
      onReSlow(target);
    }

    // Log the cast
    env.logger.log({
      type: "slow_cast",
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

        target.slowed += duration;

        env.logger.log({
          type: "slow_hit",
          sourceId: sourceId,
          targetId: targetId,
          effectDuration: duration,
        });
      },
    });
  }
}
