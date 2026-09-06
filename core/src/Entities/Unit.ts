import * as Card from "./Card";
import * as Random from "../math/Random";
import { CardDefinition, Effect, EffectReaction, Unit } from "../Models";

export const testCardDefinitions = {
  basicWarrior: {
    id: "basic-warrior",
    name: "Basic Warrior",
    pic: "warrior.png",
    power: 30,
    cooldown: 100,
  },
  basicHealer: {
    id: "basic-healer",
    name: "Basic Healer",
    pic: "healer.png",
    power: 20,
    cooldown: 120,
  },
  basicTank: {
    id: "basic-tank",
    name: "Basic Tank",
    pic: "tank.png",
    power: 15,
    cooldown: 80,
  },
} as const;

export function calculateCritical(
  rng: { seed: string },
  u: Unit,
): {
  isCritical: boolean;
  multiplier: number;
  bonusPower: number;
  seed: string;
} {
  const critChance = u.critical || 0;
  const effectiveCritChance = Math.min(critChance, 100);
  const excessCrit = Math.max(critChance - 100, 0);

  const { result: roll, seed: nextSeed } = Random.nextRandomValue(rng);
  const isCritical = critChance > 0 && roll < effectiveCritChance / 100;

  if (isCritical) {
    const multiplier = 2;
    const bonusPower = Math.floor(excessCrit / 5);
    return { isCritical: true, multiplier, bonusPower, seed: nextSeed };
  }

  return { isCritical: false, multiplier: 1, bonusPower: 0, seed: nextSeed };
}

function upgradeEffect(rankMultiplier: number, eff: Effect) {
  if (["damage", "heal", "shield", "poison", "regen"].includes(eff.id)) return;

  if (
    ["increase_power", "decrease_power", "increase_critical"].includes(eff.id)
  ) {
    if ("amount" in eff) {
      eff.amount = eff.amount * rankMultiplier;
    }
  }

  if (["multiply_power"].includes(eff.id)) {
    if ("multiplier" in eff) {
      // Scale by adding the base increment per rank level
      // Example: base 1.5 → increment 0.5 → rank 2: 1.5 + 0.5 = 2.0
      const baseIncrement = eff.baseMultiplier - 1;
      eff.multiplier =
        eff.baseMultiplier + baseIncrement * (rankMultiplier - 1);
    }
  }

  if ("targets" in eff) {
    if ("count" in eff.targets) {
      eff.targets.count = rankMultiplier;
    }
  }

  if (["charge"].includes(eff.id)) {
    if ("duration" in eff) {
      eff.duration = eff.duration * rankMultiplier;
    }
  }
}

export function upgradeUnitEffects(unit: Unit, startingRank: number = 1) {
  const rankMultiplier = unit.rank - startingRank + 1;

  unit.effects.forEach((eff) => {
    upgradeEffect(rankMultiplier, eff);
  });

  unit.reactions.forEach((r) => {
    r.effects.forEach((eff) => {
      upgradeEffect(rankMultiplier, eff);
    });
  });
}

/**
 * Record an orb/encounter-granted effect on the unit so rank upgrades keep
 * it (see `resetUnitEffectsToCardDefinition`). Stores a pristine clone —
 * the live copy in `unit.effects` is rank-scaled in place by
 * `upgradeUnitEffects`, while this ledger stays unscaled so the next reset
 * re-scales from the base shape instead of compounding.
 */
export function recordGrantedEffect(unit: Unit, effect: Effect): void {
  unit.grantedEffects = [...(unit.grantedEffects ?? []), structuredClone(effect)];
}

/**
 * Record an orb/encounter-granted reaction on the unit (pristine clone —
 * see `recordGrantedEffect`).
 */
export function recordGrantedReaction(
  unit: Unit,
  reaction: EffectReaction,
): void {
  unit.grantedReactions = [
    ...(unit.grantedReactions ?? []),
    structuredClone(reaction),
  ];
}

/**
 * Drop one ledger entry matching a removed ability so a sacrificed
 * effect/reaction is not resurrected by the next rank-up. Matches by deep
 * equality first; falls back to the lineage key because the live copy is
 * rank-scaled (amount/count/duration drift from the pristine ledger shape).
 */
function dropGrantedEntry<T>(
  entries: T[] | undefined,
  removed: T,
  lineageKey: (entry: T) => string,
): T[] | undefined {
  if (!entries || entries.length === 0) return entries;
  const removedKey = lineageKey(removed);
  let dropped = false;
  return entries.filter((e) => {
    if (dropped) return true;
    if (
      JSON.stringify(e) === JSON.stringify(removed) ||
      lineageKey(e) === removedKey
    ) {
      dropped = true;
      return false;
    }
    return true;
  });
}

const effectLineage = (e: Effect): string =>
  `${e.id}|${JSON.stringify(("targets" in e ? e.targets : null) ?? null)}`;

const reactionLineage = (r: EffectReaction): string =>
  `${r.position}|${r.effectId}`;

/**
 * Remove a sacrificed effect from the live array and the grant ledger.
 * A sacrificed base-definition copy is restored by the next reset on its
 * own, so it leaves the ledger untouched (otherwise a same-lineage grant
 * would be dropped as collateral).
 */
export function removeUnitEffect(unit: Unit, effect: Effect): void {
  unit.effects = unit.effects.filter((e) => e !== effect);
  if (isBaseEffect(unit, effect)) return;
  unit.grantedEffects = dropGrantedEntry(
    unit.grantedEffects,
    effect,
    effectLineage,
  );
}

/** Remove a sacrificed reaction from the live array and the grant ledger. */
export function removeUnitReaction(
  unit: Unit,
  reaction: EffectReaction,
): void {
  unit.reactions = unit.reactions.filter((r) => r !== reaction);
  if (isBaseReaction(unit, reaction)) return;
  unit.grantedReactions = dropGrantedEntry(
    unit.grantedReactions,
    reaction,
    reactionLineage,
  );
}

/** Rank-scaled base effects the live array holds at the unit's rank. */
function scaledBaseEffects(unit: Unit, cardDef: CardDefinition): Effect[] {
  const probe = {
    rank: unit.rank,
    effects: structuredClone(cardDef.effects ?? []),
    reactions: [],
  } as unknown as Unit;
  upgradeUnitEffects(probe, cardDef.rank || 1);
  return probe.effects;
}

/** Rank-scaled base reactions the live array holds at the unit's rank. */
function scaledBaseReactions(
  unit: Unit,
  cardDef: CardDefinition,
): EffectReaction[] {
  const probe = {
    rank: unit.rank,
    effects: [],
    reactions: structuredClone(cardDef.reactions ?? []),
  } as unknown as Unit;
  upgradeUnitEffects(probe, cardDef.rank || 1);
  return probe.reactions;
}

function isBaseEffect(unit: Unit, effect: Effect): boolean {
  const cardDef = Card.getCardDefinition(unit.cardId);
  return scaledBaseEffects(unit, cardDef).some(
    (b) => JSON.stringify(b) === JSON.stringify(effect),
  );
}

function isBaseReaction(unit: Unit, reaction: EffectReaction): boolean {
  const cardDef = Card.getCardDefinition(unit.cardId);
  return scaledBaseReactions(unit, cardDef).some(
    (b) => JSON.stringify(b) === JSON.stringify(reaction),
  );
}

export function resetUnitEffectsToCardDefinition(
  unit: Unit,
  cardDef: CardDefinition,
) {
  unit.effects = structuredClone(cardDef.effects ?? []);
  unit.reactions = structuredClone(cardDef.reactions ?? []);
  // Re-append orb/encounter-granted abilities (pristine shapes — the caller,
  // `upgradeUnitData`, rank-scales the merged arrays fresh via
  // `upgradeUnitEffects`, so grants never compound across ranks).
  for (const effect of unit.grantedEffects ?? []) {
    unit.effects.push(structuredClone(effect));
  }
  for (const reaction of unit.grantedReactions ?? []) {
    unit.reactions.push(structuredClone(reaction));
  }
}

export function upgradeUnitData(unit: Unit) {
  const source = Card.getCardDefinition(unit.cardId);

  unit.rank += 1;

  if (source.power) {
    // Calculate power based on incremental ranks from the starting rank
    // For a unit starting at rank 2 with power 100:
    // - At rank 2: 100 * 1 = 100
    // - At rank 3: 100 * 2 = 200
    // - At rank 4: 100 * 3 = 300
    const startingRank = source.rank || 1;
    const rankMultiplier = unit.rank - startingRank + 1;
    unit.power = source.power * rankMultiplier + unit.bonusPower;
  }

  resetUnitEffectsToCardDefinition(unit, source);
  upgradeUnitEffects(unit, source.rank || 1);
}

export function resetUnitStats(unit: Unit) {
  const source = Card.getCardDefinition(unit.cardId);

  const startingRank = source.rank || 1;
  const rankMultiplier = unit.rank - startingRank + 1;
  unit.power = (source.power || 0) * rankMultiplier + unit.bonusPower;
  unit.critical = (source.critical || 0) + (unit.bonusCritical || 0);
  unit.shield = 0;
  unit.charge = 0;
  unit.hasted = 0;
  unit.slowed = 0;
  unit.silenced = 0;
  unit.refresh = 0;
  unit.life = unit.maxLife;
}

export function applyPowerDelta(
  unit: Unit,
  delta: number,
  permanent: boolean,
): number {
  const nextPower = Math.max(0, unit.power + delta);
  const appliedDelta = nextPower - unit.power;

  unit.power = nextPower;

  if (permanent) {
    unit.bonusPower += appliedDelta;
  }

  return appliedDelta;
}
