import * as Card from "./Card";
import * as Random from "../math/Random";
import { CardDefinition, Effect, Unit } from "../Models";

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

export function resetUnitEffectsToCardDefinition(
  unit: Unit,
  cardDef: CardDefinition,
) {
  const newReactions = unit.reactions.filter((r) => {
    return !cardDef.reactions.some((c) => c.effectId === r.effectId);
  });
  unit.effects = structuredClone(cardDef.effects ?? []);
  unit.reactions = structuredClone(cardDef.reactions ?? []).concat(
    newReactions,
  );
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
