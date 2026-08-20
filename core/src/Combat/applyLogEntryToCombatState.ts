import * as CombatLogger from "./CombatLogger";
import type { CombatState } from "../types/combat";

/**
 * Apply the combat-state mutations a log entry represents (status durations,
 * power deltas) to the given combat state. Only entries that carry replay
 * state changes are handled; the rest are no-ops. Matches the server-side
 * simulation semantics so playback reproduces the final unit stats.
 */
export function applyLogEntryToCombatState(
  combatState: CombatState,
  log: CombatLogger.CombatLogInput,
): void {
  switch (log.type) {
    case "haste_hit": {
      const target = combatState.unitById.get(log.targetId);
      if (target) target.hasted += log.effectDuration;
      break;
    }
    case "slow_hit": {
      const target = combatState.unitById.get(log.targetId);
      if (target) target.slowed += log.effectDuration;
      break;
    }
    case "charge_hit": {
      const target = combatState.unitById.get(log.targetId);
      if (target) target.charge += log.amount;
      break;
    }
    case "silence_hit": {
      // Additive-friendly, same as TriggerSystem/effects/silence: re-silencing
      // keeps the longest remaining duration.
      const target = combatState.unitById.get(log.targetId);
      if (target)
        target.silenced = Math.max(target.silenced, log.effectDuration);
      break;
    }
    case "dispel_hit": {
      // D2: dispel strips the target's haste/slow/charge/shield/silence
      // counters. (Force-keyed poison/regen stacks live in the combat system
      // states, which this function does not see.)
      const target = combatState.unitById.get(log.targetId);
      if (target) {
        target.hasted = 0;
        target.slowed = 0;
        target.charge = 0;
        target.shield = 0;
        target.silenced = 0;
      }
      break;
    }
    case "haste_end": {
      const target = combatState.unitById.get(log.unitId);
      if (target) target.hasted = 0;
      break;
    }
    case "slow_end": {
      const target = combatState.unitById.get(log.unitId);
      if (target) target.slowed = 0;
      break;
    }
    case "silence_end": {
      const target = combatState.unitById.get(log.unitId);
      if (target) target.silenced = 0;
      break;
    }
    case "increase_power": {
      const target = combatState.unitById.get(log.targetId);
      if (target) {
        target.power += log.amount;
        if (log.permanent) target.bonusPower += log.amount;
      }
      break;
    }
    case "decrease_power": {
      const target = combatState.unitById.get(log.affectedUnitId);
      if (target) {
        target.power -= log.amount;
        if (log.permanent) target.bonusPower -= log.amount;
      }
      break;
    }
    default:
      break;
  }
}
