import * as Models from "../Models";
import * as effects from "./effects";
import { pickRandom } from "../math/Random";

// Process a list of effects that originate from a given source unit
export const processEffectsIO = (
  env: Models.CombatEnvironment,
  sourceUnit: Models.Unit,
  effectsList: Models.Effect[],
  isReaction: boolean,
  triggeringUnit?: Models.Unit,
  scale: number = 1,
) => {
  effectsList.forEach((effect) => {
    processEffectIO(env, sourceUnit, effect, isReaction, triggeringUnit, scale);
  });
};

const processEffectIO = (
  env: Models.CombatEnvironment,
  sourceUnit: Models.Unit,
  effect: Models.Effect,
  isReaction: boolean,
  triggeringUnit?: Models.Unit,
  scale: number = 1,
) => {
  // C1 (docs/wacky-content-plan.md): `repeat` re-fires the effect N times per
  // cast. Capped at 3 by the balance gate; each fire logs its own cast/hit
  // entries, keeping combat playback deterministic.
  const repeatCount = Math.max(1, effect.repeat ?? 1);
  for (let i = 0; i < repeatCount; i++) {
    switch (effect.id) {
      case "damage":
        effects.dealDamage(env, sourceUnit, scale, isReaction);
        break;
      case "heal":
        effects.restoreLife(env, sourceUnit, scale);
        break;
      case "shield":
        effects.addShield(env, sourceUnit, scale);
        break;
      case "poison":
        effects.applyPoison(env, sourceUnit, scale);
        break;
      case "regen":
        effects.applyRegen(env, sourceUnit, scale);
        break;
      case "haste":
        const hasteTargets = resolveTargets(
          env,
          sourceUnit,
          effect,
          triggeringUnit,
        );
        effects.applyHaste(
          env,
          hasteTargets,
          sourceUnit,
          effect.duration * scale,
          (_target: Models.Unit) =>
            processReactions(env, sourceUnit, { id: "re_hasted" }, scale),
        );
        break;
      case "slow":
        const slowTargets = resolveTargets(
          env,
          sourceUnit,
          effect,
          triggeringUnit,
        );
        effects.applySlow(
          env,
          sourceUnit,
          slowTargets,
          effect.duration * scale,
          (_target: Models.Unit) =>
            processReactions(env, sourceUnit, { id: "re_slow" }, scale),
        );
        break;
      case "silence":
        const silenceTargets = resolveTargets(
          env,
          sourceUnit,
          effect,
          triggeringUnit,
        );
        effects.applySilence(
          env,
          sourceUnit,
          silenceTargets,
          effect.duration * scale,
        );
        break;
      case "dispel":
        const dispelTargets = resolveTargets(
          env,
          sourceUnit,
          effect,
          triggeringUnit,
        );
        effects.applyDispel(env, sourceUnit, dispelTargets);
        break;
      case "charge":
        const chargeTargets = resolveTargets(
          env,
          sourceUnit,
          effect,
          triggeringUnit,
        );
        effects.applyCharge(
          env,
          sourceUnit,
          chargeTargets,
          effect.duration * scale,
        );
        break;
      case "increase_power":
        const increasePowerTargets = resolveTargets(
          env,
          sourceUnit,
          effect,
          triggeringUnit,
        );
        effects.increasePower(
          env,
          increasePowerTargets,
          effect.amount * scale,
          effect.permanent || false,
          sourceUnit,
        );
        break;
      case "decrease_power":
        const decreasePowerTargets = resolveTargets(
          env,
          sourceUnit,
          effect,
          triggeringUnit,
        );
        effects.decreasePower(
          env,
          decreasePowerTargets,
          effect.amount * scale,
          effect.permanent || false,
          sourceUnit,
        );
        break;
      case "increase_critical":
        const increaseCriticalTargets = resolveTargets(
          env,
          sourceUnit,
          effect,
          triggeringUnit,
        );
        effects.increaseCritical(
          env,
          increaseCriticalTargets,
          effect.amount * scale,
          sourceUnit,
          effect.permanent || false,
        );
        break;
      case "multiply_power":
        effects.multiplyPower({
          env,
          targets: resolveTargets(env, sourceUnit, effect, triggeringUnit),
          sourceUnit,
          multiplier: Math.pow(effect.multiplier, scale),
        });
        break;
      case "distribute_power":
        effects.distributePower(
          env,
          sourceUnit,
          resolveTargets(env, sourceUnit, effect, triggeringUnit),
          effect.permanent || false,
        );
        break;
      case "absorb_power":
        effects.absorbPower(
          env,
          sourceUnit,
          resolveTargets(env, sourceUnit, effect, triggeringUnit),
          effect.permanent || false,
        );
        break;
      case "sacrifice_effect":
        effects.sacrificeEffect(env, sourceUnit);
        break;
      case "re_hasted":
        break;
      case "re_slow":
        break;
      case "on_crit":
      case "every_100_damage":
      case "every_100_shield":
      case "every_100_heal":
      case "every_10_poison":
      case "every_10_regen":
      case "on_over_heal":
      case "on_battle_start":
      case "on_crystal_hit":
        break;
      default:
        const _exhaustiveCheck: never = effect;
        return _exhaustiveCheck;
    }
  }

  if (!isReaction) processReactions(env, sourceUnit, effect, scale);
};

const sameForce = (unit: Models.Unit, triggeringUnit: Models.Unit) =>
  unit.force === triggeringUnit.force;

/**
 * Fire reactions on all eligible units in response to an effect.
 *
 * ## How position + triggerTeam interact
 *
 * `position` answers: "Is the reactor positioned correctly relative to the triggerer?"
 * `triggerTeam` answers: "Which team's activity does the reactor care about?"
 *
 * The triggerer is always a unit from the force whose activity triggered the reaction:
 *   - For direct effects (damage, heal, etc.), it's the unit that performed the action.
 *   - For threshold reactions (every_100_damage, etc.), it's a representative from the
 *     force whose accumulated stats crossed the threshold.
 *
 * | triggerTeam | effect                      | position needed | meaning                          |
 * |-------------|-----------------------------|-----------------|----------------------------------|
 * | "own"       | Player damage crosses 100   | "allies"        | "My team's damage → allies react"|
 * | "enemy"     | Enemy damage crosses 100    | "enemies"       | "Enemy's damage → my team reacts"|
 *
 * Note: `triggerTeam: "enemy"` requires `position: "enemies"` because the triggerer
 * is from the opposing force — so from the reactor's perspective, the triggerer IS an enemy.
 */
/**
 * B1 (docs/wacky-content-plan.md): evaluate a reaction's `when` predicate
 * against the reactor's board state at trigger time.
 *
 * Pure + deterministic (board state only — no RNG, no logs). A reaction
 * without `when` always passes. Allies = every unit on the reactor's force
 * (including the reactor and its core); `ofTypes` requires at least one ally
 * whose effects include each listed EffectId.
 */
export function reactionPredicateAllows(
  env: Models.CombatEnvironment,
  reactor: Models.Unit,
  when: Models.ReactionPredicate | undefined,
): boolean {
  if (!when) return true;

  const allies = env.combatState.units.filter((u) => u.force === reactor.force);

  if (when.minAllies !== undefined && allies.length < when.minAllies) {
    return false;
  }
  if (when.maxAllies !== undefined && allies.length > when.maxAllies) {
    return false;
  }
  if (when.ofTypes) {
    for (const type of when.ofTypes) {
      const hasType = allies.some((u) => u.effects.some((e) => e.id === type));
      if (!hasType) return false;
    }
  }
  return true;
}

export function processReactions(
  env: Models.CombatEnvironment,
  triggeringUnit: Models.Unit,
  effect: Models.Effect,
  scale: number = 1,
) {
  if (
    ["charge", "increase_power", "decrease_power", "multiply_power"].includes(
      effect.id,
    )
  ) {
    return;
  }
  const candidates = env.combatState.units.filter(
    (u) =>
      u.id != triggeringUnit.id || Models.GLOBAL_REACTIONS.includes(effect.id),
  );

  candidates.forEach((u) => {
    const reactions = u.reactions
      .filter(
        (r) =>
          r.effectId === effect.id ||
          (r.effectId === "all" && Models.BASIC_ABILITIES.includes(effect.id)),
      )
      .filter((r) => {
        // triggerTeam: "own" (default) → only react to own team's stats
        // triggerTeam: "enemy" → only react to opposing team's stats
        if (r.triggerTeam === "own" && u.force !== triggeringUnit.force)
          return false;
        if (r.triggerTeam === "enemy" && u.force === triggeringUnit.force)
          return false;
        switch (r.position) {
          case "all":
            return true;
          case "allies":
            return sameForce(u, triggeringUnit);
          case "enemies":
            return !sameForce(u, triggeringUnit);
          case "row_allies":
            return (
              sameForce(u, triggeringUnit) &&
              u.position[1] === triggeringUnit.position[1]
            );
          case "column_allies":
            return (
              sameForce(u, triggeringUnit) &&
              u.position[0] === triggeringUnit.position[0]
            );
          case "top_ally":
            return (
              sameForce(u, triggeringUnit) &&
              triggeringUnit.position[1] === u.position[1] - 1 &&
              triggeringUnit.position[0] === u.position[0]
            );
          case "bottom_ally":
            return (
              sameForce(u, triggeringUnit) &&
              triggeringUnit.position[1] === u.position[1] + 1 &&
              triggeringUnit.position[0] === u.position[0]
            );
          case "left_ally":
            return (
              sameForce(u, triggeringUnit) &&
              triggeringUnit.position[0] === u.position[0] - 1 &&
              triggeringUnit.position[1] === u.position[1]
            );
          case "right_ally":
            return (
              sameForce(u, triggeringUnit) &&
              triggeringUnit.position[0] === u.position[0] + 1 &&
              triggeringUnit.position[1] === u.position[1]
            );
          case "self":
            return u.id === triggeringUnit.id;
          default:
            const _exhaustiveCheck: never = r.position;
            return _exhaustiveCheck;
        }
      })
      // B1 (docs/wacky-content-plan.md): reactions with a `when` predicate only
      // fire when their board-state gate holds for the reactor at trigger time.
      .filter((r) => reactionPredicateAllows(env, u, r.when));

    reactions.forEach((r) => {
      env.logger.log({
        type: "reaction",
        unitId: u.id,
      });
      processEffectsIO(env, u, r.effects, true, triggeringUnit, scale);
    });
  });
}

export function resolveTargets(
  env: Models.CombatEnvironment,
  sourceUnit: Models.Unit,
  effect: Models.Effect,
  triggeringUnit?: Models.Unit,
): Models.Unit[] {
  if (!("targets" in effect)) {
    return [];
  }

  const allUnits = env.combatState.units;
  const allies = allUnits.filter((u) => u.force === sourceUnit.force);
  const enemies = allUnits.filter((u) => u.force !== sourceUnit.force);

  switch (effect.targets.id) {
    case "self":
      return [sourceUnit];

    case "random_ally": {
      const otherAllies = allies.filter((u) => u.id !== sourceUnit.id);
      const { picked, seed } = pickRandom(
        env,
        otherAllies,
        effect.targets.count,
      );
      env.seed = seed;
      return picked;
    }

    case "random_enemy": {
      const { picked, seed } = pickRandom(env, enemies, effect.targets.count);
      env.seed = seed;
      return picked;
    }

    case "row_allies":
      return allies
        .filter((u) => u.id !== sourceUnit.id)
        .filter((u) => u.position[1] === sourceUnit.position[1]);

    case "column_allies":
      return allies
        .filter((u) => u.id !== sourceUnit.id)
        .filter((u) => u.position[0] === sourceUnit.position[0]);

    case "all_allies":
      const validType = effect.targets.ofType;
      if (validType === "any")
        return allies.filter((u) => u.id !== sourceUnit.id);
      else
        return allies.filter((u) => u.effects.some((e) => e.id === validType));

    case "all_enemies":
      return enemies;

    case "strongest_enemy":
      const strongestEnemies = enemies.sort((a, b) => b.power - a.power);
      return strongestEnemies.length > 0 ? [strongestEnemies[0]] : [];

    case "weakest_enemy":
      const weakestEnemies = enemies.sort((a, b) => a.power - b.power);
      return weakestEnemies.length > 0 ? [weakestEnemies[0]] : [];

    case "strongest_ally":
      const strongestAllies = allies
        .filter((u) => u.id !== sourceUnit.id)
        .sort((a, b) => b.power - a.power);
      return strongestAllies.length > 0 ? [strongestAllies[0]] : [];

    case "weakest_ally":
      const weakestAllies = allies
        .filter((u) => u.id !== sourceUnit.id)
        .sort((a, b) => a.power - b.power);
      return weakestAllies.length > 0 ? [weakestAllies[0]] : [];

    case "top_ally":
      return allies.filter(
        (u) =>
          u.position[1] === sourceUnit.position[1] - 1 &&
          u.position[0] === sourceUnit.position[0],
      );

    case "bottom_ally":
      return allies.filter(
        (u) =>
          u.position[1] === sourceUnit.position[1] + 1 &&
          u.position[0] === sourceUnit.position[0],
      );

    case "left_ally":
      return allies.filter(
        (u) =>
          u.position[0] === sourceUnit.position[0] - 1 &&
          u.position[1] === sourceUnit.position[1],
      );

    case "right_ally":
      return allies.filter(
        (u) =>
          u.position[0] === sourceUnit.position[0] + 1 &&
          u.position[1] === sourceUnit.position[1],
      );

    case "trigger":
      return triggeringUnit ? [triggeringUnit] : [sourceUnit];

    default:
      const formattedEvent = JSON.stringify(effect, null, 2);
      throw new Error(`Unknown target type. Effect: ${formattedEvent}`);
  }
}
