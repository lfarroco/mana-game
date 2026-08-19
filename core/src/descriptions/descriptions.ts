import { ABILITY_COLORS } from "../data/abilityColors";
import type {
  Effect,
  EffectReaction,
  ReactionPredicate,
  Targeting,
} from "../Models";

/** Injected translate function (same signature as the phaser i18n `t`). */
export type Translate = (
  key: string,
  params?: Record<string, string>,
) => string;

/**
 * C1 (docs/wacky-content-plan.md): append the repeat suffix to a built effect
 * description. Single-cast effects are untouched.
 */
const applyRepeat = (text: string, effect: Effect, t: Translate): string =>
  (effect.repeat ?? 1) > 1
    ? t("tooltip.sentence.repeat", {
        count: String(effect.repeat),
        effect: text,
      })
    : text;

const MS_PER_SECOND = 1000;

/**
 * Safe accessor for the `count` property on Targeting variants that have it
 * (random_ally, random_enemy). Returns undefined for other targeting variants.
 */
const getCount = (targets: Targeting | undefined): number | undefined =>
  targets && (targets.id === "random_ally" || targets.id === "random_enemy")
    ? targets.count
    : undefined;

/**
 * Safe accessor for the `targets` property on Effect variants that carry
 * a targeting specification. Returns undefined for effects without targets.
 */
const getEffectTargets = (effect: Effect): Targeting | undefined => {
  switch (effect.id) {
    case "haste":
    case "slow":
    case "silence":
    case "charge":
    case "increase_power":
    case "decrease_power":
    case "multiply_power":
    case "increase_critical":
    case "distribute_power":
    case "absorb_power":
    case "sacrifice_effect":
      return effect.targets;
    default:
      return undefined;
  }
};

const getTargetDescription = (targets: Targeting, t: Translate): string => {
  if (!targets) return t("tooltip.targets.default");

  let key = `tooltip.sentence.target.${targets.id}`;
  const count = getCount(targets);

  if (targets.id === "random_ally" && count && count > 1)
    key = "tooltip.sentence.target.random_allies";
  if (targets.id === "random_enemy" && count && count > 1)
    key = "tooltip.sentence.target.random_enemies";

  if (targets.id === "all_allies" && targets.ofType !== "any") {
    return t("tooltip.sentence.target.all_allies_type", {
      type: targets.ofType,
      color: ABILITY_COLORS[targets.ofType],
    });
  }

  return t(key, { count: (count ?? 0).toString() });
};

const isTargetPlural = (targets?: Targeting): boolean => {
  if (!targets) return true; // Default to plural "targets" if undefined? Or maybe false? "Targets" is plural.

  switch (targets.id) {
    case "self":
    case "strongest_ally":
    case "weakest_ally":
    case "strongest_enemy":
    case "weakest_enemy":
    case "trigger":
    case "top_ally":
    case "bottom_ally":
    case "left_ally":
    case "right_ally":
      return false;
    case "random_ally":
    case "random_enemy":
      return (getCount(targets) ?? 1) > 1;
    case "all_allies":
    case "all_enemies":
    case "row_allies":
    case "column_allies":
      return true;
    default:
      return true;
  }
};

const COMPACT_TARGET_MAP: Record<string, string> = {
  top_ally: "top",
  bottom_ally: "bottom",
  left_ally: "left",
  right_ally: "right",
};

const getCompactTargetDescription = (
  targets: Targeting,
  color: string | undefined,
  t: Translate,
): string => {
  if (!targets) return "";
  let id: string = targets.id;
  if (COMPACT_TARGET_MAP[id]) {
    id = COMPACT_TARGET_MAP[id];
  }

  const count = getCount(targets);
  if (targets.id === "random_ally" && count && count > 1)
    return t("tooltip.targets.random_allies", {
      count: count.toString(),
      color: color || "",
    });
  if (targets.id === "random_enemy" && count && count > 1)
    return t("tooltip.targets.random_enemies", {
      count: count.toString(),
      color: color || "",
    });

  if (targets.id === "all_allies" && targets.ofType !== "any") {
    return t("tooltip.targets.all_allies_type", {
      type: targets.ofType,
      color: ABILITY_COLORS[targets.ofType],
    });
  }

  return t(`tooltip.targets.${id}`, { color: color || "" });
};

export const buildCompactEffectBlock = (
  effect: Effect,
  unitPower: number,
  t: Translate,
): string | null => {
  const amount = unitPower.toString();
  const color = ABILITY_COLORS[effect.id] || "#ffffff";
  const effectName = t(`tooltip.effects.${effect.id}`);

  const targets = getEffectTargets(effect);
  const targetDesc = targets
    ? getCompactTargetDescription(targets, color, t)
    : "";

  let effectString = "";

  switch (effect.id) {
    case "damage":
    case "heal":
    case "shield":
    case "poison":
    case "regen":
      effectString = `[color=${color}]${effectName} ${amount}[/color]`;
      break;
    case "haste":
    case "slow":
    case "charge": {
      const dur = (effect.duration / MS_PER_SECOND).toFixed(1);
      effectString = `[color=${color}]${effectName}[/color] ${dur}s`;
      break;
    }
    case "silence": {
      const dur = (effect.duration / MS_PER_SECOND).toFixed(1);
      effectString = `[color=${color}]${effectName}[/color] ${dur}s`;
      break;
    }
    case "increase_power": {
      const suffix = effect.permanent ? "*" : "";
      effectString = `[color=${color}]+${effect.amount}${suffix} ${effectName}[/color]`;
      break;
    }
    case "decrease_power":
      effectString = `[color=${color}]-${effect.amount}${effect.permanent ? "*" : ""} ${t("tooltip.effects.increase_power")}[/color]`;
      break;
    case "increase_critical":
      effectString = `[color=${color}]+${effect.amount} ${t("tooltip.effects.increase_critical")}[/color]`;
      break;
    case "multiply_power":
      effectString = `[color=${color}]x${effect.multiplier} ${t("tooltip.effects.increase_power")}[/color]`;
      break;
    case "distribute_power":
      effectString = `50% [color=${color}]${t("tooltip.effects.increase_power")}[/color]`;
      break;
    case "absorb_power":
      effectString = `Absorb 50% [color=${color}]${t("tooltip.effects.increase_power")}[/color]`;
      break;
    case "on_crit":
    case "on_battle_start":
    case "on_over_heal":
    case "on_crystal_hit":
      return null;
    default:
      return null;
  }

  if (targetDesc) {
    return applyRepeat(`${effectString} -> ${targetDesc}`, effect, t);
  }
  return applyRepeat(effectString, effect, t);
};

export const buildEffectBlock = (
  effect: Effect,
  unitPower: number,
  t: Translate,
  compactTooltips: boolean,
): string | null => {
  if (compactTooltips) {
    return buildCompactEffectBlock(effect, unitPower, t);
  }
  const built = buildEffectSentence(effect, unitPower, t);
  return built === null ? null : applyRepeat(built, effect, t);
};

/** Non-compact single-cast sentence for one effect (no repeat suffix). */
const buildEffectSentence = (
  effect: Effect,
  unitPower: number,
  t: Translate,
): string | null => {
  const targets = getEffectTargets(effect);
  const target = targets ? getTargetDescription(targets, t) : "";
  const isPlural = isTargetPlural(targets);

  const amount = unitPower.toString();
  const color = ABILITY_COLORS[effect.id];

  switch (effect.id) {
    case "damage":
      return t("tooltip.sentence.damage", { amount, target, color });
    case "heal":
      return t("tooltip.sentence.heal", { amount, target, color });
    case "shield":
      return t("tooltip.sentence.shield", { amount, target, color });
    case "poison":
      return t("tooltip.sentence.poison", { amount, target, color });
    case "regen":
      return t("tooltip.sentence.regen", { amount, target, color });
    case "haste": {
      const dur = (effect.duration / MS_PER_SECOND).toFixed(1);
      return t("tooltip.sentence.haste", { duration: dur, target, color });
    }
    case "slow": {
      const dur = (effect.duration / MS_PER_SECOND).toFixed(1);
      return t("tooltip.sentence.slow", { duration: dur, target, color });
    }
    case "silence": {
      const dur = (effect.duration / MS_PER_SECOND).toFixed(1);
      return t("tooltip.sentence.silence", { duration: dur, target, color });
    }
    case "charge": {
      const dur = (effect.duration / MS_PER_SECOND).toFixed(1);
      return t("tooltip.sentence.charge", { duration: dur, target, color });
    }
    case "increase_power": {
      const key = effect.permanent
        ? isPlural
          ? "tooltip.sentence.increase_power_permanent_plural"
          : "tooltip.sentence.increase_power_permanent"
        : isPlural
          ? "tooltip.sentence.increase_power_plural"
          : "tooltip.sentence.increase_power";
      return t(key, {
        amount: effect.amount.toString(),
        target,
        color,
      });
    }
    case "decrease_power":
      return t("tooltip.sentence.decrease_power", {
        amount: effect.amount.toString(),
        target,
        color,
      });
    case "increase_critical": {
      const key = isPlural
        ? "tooltip.sentence.increase_critical_plural"
        : "tooltip.sentence.increase_critical";
      return t(key, {
        amount: effect.amount.toString(),
        target,
        color,
      });
    }
    case "multiply_power":
      return t("tooltip.sentence.multiply_power", {
        amount: effect.multiplier.toString(),
        target,
        color,
      });
    case "distribute_power":
      return t("tooltip.sentence.distribute_power", {
        target,
        color,
      });
    case "absorb_power":
      return t("tooltip.sentence.absorb_power", {
        target,
        color,
      });
    case "sacrifice_effect":
    case "re_hasted":
    case "re_slow":
    case "on_crit":
    case "every_100_damage":
    case "every_100_shield":
    case "every_100_heal":
    case "every_10_poison":
    case "every_10_regen":
    case "on_over_heal":
    case "on_battle_start":
    case "on_crystal_hit":
      return null;
    default: {
      const _exhaustiveCheck: never = effect;
      return _exhaustiveCheck;
    }
  }
};

const getPositionDescription = (position: string, t: Translate): string => {
  switch (position) {
    case "all":
      return t("tooltip.sentence.position.any");
    case "allies":
      return t("tooltip.sentence.position.ally");
    case "enemies":
      return t("tooltip.sentence.position.enemy");
    case "row_allies":
      return t("tooltip.sentence.position.row");
    case "column_allies":
      return t("tooltip.sentence.position.column");
    case "top_ally":
      return t("tooltip.sentence.position.top");
    case "bottom_ally":
      return t("tooltip.sentence.position.bottom");
    case "left_ally":
      return t("tooltip.sentence.position.left");
    case "right_ally":
      return t("tooltip.sentence.position.right");
    default:
      return position;
  }
};

export const getReactionDescription = (
  reaction: EffectReaction,
  unitPower: number,
  t: Translate,
  compactTooltips: boolean,
): string => {
  const whenText = reaction.when ? getWhenDescription(reaction.when, t) : null;

  if (compactTooltips) {
    const style = ABILITY_COLORS[reaction.effectId];
    const color = style || "#51cf66";
    const effectKey = reaction.effectId === "all" ? "any" : reaction.effectId;
    const sourceDesc = reaction.position
      ? getCompactTargetDescription(
          { id: reaction.position } as Targeting,
          color,
          t,
        )
      : t("tooltip.targets.source", { color });
    const effectName = t(`tooltip.effects.${effectKey}`);

    let triggerText = `⚡ ${effectName} (${sourceDesc})`;

    if (reaction.effectId === "on_crit") {
      triggerText = `⚡ ${t("tooltip.effects.on_crit")}`;
    } else if (reaction.effectId === "on_battle_start") {
      triggerText = `⚡ ${t("tooltip.effects.on_battle_start")}`;
    } else if (reaction.effectId === "on_over_heal") {
      triggerText = `⚡ ${t("tooltip.effects.on_over_heal")} (${sourceDesc})`;
    } else if (reaction.effectId === "on_crystal_hit") {
      triggerText = `⚡ ${t("tooltip.effects.on_crystal_hit")} (${sourceDesc})`;
    }

    const effectSegments = reaction.effects
      .map((e) => buildCompactEffectBlock(e, unitPower, t))
      .filter((e): e is string => e !== null);

    const effectText = effectSegments.join(" -> ");
    const base = `${triggerText} -> ${effectText}`;
    return whenText ? `${base} (${whenText})` : base;
  }

  const style = ABILITY_COLORS[reaction.effectId];
  const effectKey = reaction.effectId === "all" ? "any" : reaction.effectId;
  const color = style || "#51cf66";

  const sourceDesc = reaction.position
    ? getPositionDescription(reaction.position, t)
    : t("tooltip.sentence.position.any");
  const effectName = t(`tooltip.effects.${effectKey}`);

  let triggerText = "";
  if (reaction.effectId === "on_crit") {
    triggerText = t("tooltip.sentence.trigger.on_crit", { source: sourceDesc });
  } else if (reaction.effectId === "on_battle_start") {
    triggerText = t("tooltip.sentence.trigger.on_battle_start");
  } else if (reaction.effectId === "on_over_heal") {
    triggerText = t("tooltip.sentence.trigger.on_over_heal", {
      source: sourceDesc,
    });
  } else if (reaction.effectId === "on_crystal_hit") {
    triggerText = t("tooltip.sentence.trigger.on_crystal_hit", {
      source: sourceDesc,
    });
  } else {
    triggerText = t("tooltip.sentence.trigger.default", {
      source: sourceDesc,
      effect: effectName,
      color,
    });
  }

  const coloredTrigger = triggerText;

  const effectSegments = reaction.effects
    .map((e) => buildEffectBlock(e, unitPower, t, compactTooltips))
    .filter((e): e is string => e !== null);

  const effectText = effectSegments.join(
    effectSegments.length > 1 ? "\n" : ", ",
  );

  const base = t("tooltip.sentence.reaction", {
    trigger: coloredTrigger,
    effect: effectText,
  });
  return whenText
    ? t("tooltip.sentence.reaction_with_when", {
        reaction: base,
        when: whenText,
      })
    : base;
};

/**
 * B1 (docs/wacky-content-plan.md): render a reaction's `when` predicate as a
 * short human-readable clause, e.g. "3+ allies + poison ally".
 */
const getWhenDescription = (when: ReactionPredicate, t: Translate): string => {
  const parts: string[] = [];
  if (when.minAllies !== undefined) {
    parts.push(
      t("tooltip.sentence.when.min_allies", { count: String(when.minAllies) }),
    );
  }
  if (when.maxAllies !== undefined) {
    parts.push(
      t("tooltip.sentence.when.max_allies", { count: String(when.maxAllies) }),
    );
  }
  if (when.ofTypes) {
    for (const type of when.ofTypes) {
      parts.push(
        t("tooltip.sentence.when.of_type", {
          effect: t(`tooltip.effects.${type}`),
        }),
      );
    }
  }
  return parts.join(" + ");
};
