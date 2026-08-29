import * as CombatStatsTracker from "../../Combat/CombatStatsTracker";
import { CombatEnvironment, Unit } from "../../Models";
import { calculateCritical } from "../../Entities/Unit";
import { getBattleCore } from "../../Entities/Card";
import { manipulateCoreShield } from "../../Entities/Force";
import { processReactions } from "../TriggerSystem";

const PROJECTILE_TRAVEL_MS = 200;

export const addShield = (
  env: CombatEnvironment,
  sourceUnit: Unit,
  scale: number = 1,
  isReaction: boolean = false,
) => {
  const baseAmount = sourceUnit.power;
  const alliedCore = env.combatState.units.find(
    (u) => u.force === sourceUnit.force && u.isCore,
  )!;

  const crit = calculateCritical(env, sourceUnit);
  env.seed = crit.seed;
  const shieldAmount = (baseAmount + crit.bonusPower) * crit.multiplier * scale;

  // Log the cast
  env.logger.log({
    type: "shield_cast",
    sourceId: sourceUnit.id,
    targetId: alliedCore.id,
    amount: shieldAmount,
    travelTime: PROJECTILE_TRAVEL_MS,
  });

  const currentTimeMs = env.logger.getCurrentTimeMs();
  const sourceId = sourceUnit.id;
  const targetId = alliedCore.id;
  const isCritical = crit.isCritical;
  const sourceForce = sourceUnit.force;

  // Reaction-sourced shields (e.g. the verdant thorn_shield reaction) apply
  // IMMEDIATELY instead of after the 200ms projectile travel. The reaction
  // fires when the crystal is hit, and the shield must be up before the damage
  // that triggered the reaction resolves — otherwise "when the crystal is hit,
  // gain shield" never protects against the very hit that procs it (the shield
  // would always arrive 200ms late, and a fast/hard-hitting enemy like
  // Spellblade could one-shot through it). Regular casts keep the projectile.
  if (isReaction) {
    applyShieldHit(env, {
      sourceId,
      sourceForce,
      targetId,
      shieldAmount,
      isCritical,
    });
    return;
  }

  env.deferredEvents.push({
    timeMs: currentTimeMs + PROJECTILE_TRAVEL_MS,
    execute: (env) => {
      applyShieldHit(env, {
        sourceId,
        sourceForce,
        targetId,
        shieldAmount,
        isCritical,
      });
    },
  });
};

/**
 * Apply the shield to the source force's core and log the hit. Shared by the
 * deferred (cast) and immediate (reaction) paths so both produce identical
 * state + logs — only the timing differs.
 */
function applyShieldHit(
  env: CombatEnvironment,
  params: {
    sourceId: string;
    sourceForce: string;
    targetId: string;
    shieldAmount: number;
    isCritical: boolean;
  },
): void {
  const { sourceId, sourceForce, targetId, shieldAmount, isCritical } = params;
  const { combatState: state } = env;

  const sourceUnit = state.units.find((u) => u.id === sourceId);
  if (!sourceUnit) return;

  const alliedCore = getBattleCore(env.combatState)(sourceUnit.force);
  const oldShield = alliedCore.shield;

  const actualShieldChange = manipulateCoreShield(
    env.combatState,
    sourceForce,
    shieldAmount,
    isCritical,
  );

  if (actualShieldChange > 0) {
    CombatStatsTracker.trackShield(
      env.combatStates.combatStatsTrackerState,
      sourceUnit,
      actualShieldChange,
    );
  }

  if (isCritical) {
    processReactions(env, sourceUnit, { id: "on_crit" }, 1);
  }

  env.logger.log({
    type: "shield_hit",
    sourceId: sourceId,
    targetId: targetId,
    amount: shieldAmount,
    newShield: alliedCore.shield,
    shieldDelta: alliedCore.shield - oldShield,
  });
}
