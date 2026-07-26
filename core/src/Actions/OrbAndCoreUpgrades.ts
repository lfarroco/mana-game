/**
 * Orb and Core Upgrade Actions
 *
 * Handles special item effects (orbs) and core unit stat upgrades.
 * Pure functions that modify unit state based on orb type or core upgrade action.
 */

import { Unit, EffectReaction } from "../Models";
import { applyPowerDelta } from "../Entities/Unit";
import * as Random from "../math/Random";
import * as OrbConstants from "../Orbs/OrbConstants";
import { ORB_DEFINITIONS, OrbDefinition } from "../Orbs/OrbDefinitions";

const COOLDOWN_REDUCTION_FACTOR = OrbConstants.COOLDOWN_REDUCTION_FACTOR;
const CORE_STAT_SCALING_FACTOR = 0.1;
const ORB_POWER_INCREASE_FACTOR = OrbConstants.ORB_POWER_INCREASE_FACTOR;
const ORB_MIN_COOLDOWN_MS = OrbConstants.ORB_MIN_COOLDOWN_MS;
const CORE_ROUND_SCALING = 10;

/**
 * Build an EffectReaction from a reaction-type orb definition.
 * Picks one effect from `possibleEffects` using the seeded RNG.
 */
function buildReaction(def: OrbDefinition, rng: { seed: string }): EffectReaction {
  if (def.kind !== "reaction") throw new Error(`Not a reaction orb: ${def.id}`);
  return {
    position: def.position,
    effectId: def.effectId,
    effects: [Random.pickOneSeeded(rng, def.possibleEffects)],
  };
}

/**
 * Apply upgrade_orb: Rank up a unit (increase stats by 1.75x).
 * This aligns with the new bronze->silver->gold upgrade progression.
 */
function applyUpgradeOrb(unit: Unit): void {
	unit.rank = (unit.rank || 1) + 1;
	const rankMultiplier = 1.75;
	unit.maxLife = Math.floor(unit.maxLife * rankMultiplier);
	unit.life = unit.maxLife;
	unit.power = Math.floor(unit.power * rankMultiplier);
}

/**
 * Apply absorb_power_orb: Take 25% power from units in the same row.
 */
function applyAbsorbPowerOrb(targetUnit: Unit, allUnits: Unit[]): number {
	let totalAbsorbed = 0;
	allUnits.forEach((u: Unit) => {
		if (u.id !== targetUnit.id && u.position && u.position[1] === targetUnit.position[1]) {
			const absorbed = Math.floor(u.power * 0.25);
			if (absorbed > 0) {
				applyPowerDelta(u, -absorbed, true);
				totalAbsorbed += absorbed;
			}
		}
	});

	if (totalAbsorbed > 0) {
		applyPowerDelta(targetUnit, totalAbsorbed, true);
	}

	return totalAbsorbed;
}

/**
 * Apply distribute_power_orb: Give 50% of unit's power to units in the same row.
 */
function applyDistributePowerOrb(targetUnit: Unit, allUnits: Unit[]): number {
	const powerToDistribute = Math.floor(targetUnit.power * 0.5);
	if (powerToDistribute <= 0) return 0;

	applyPowerDelta(targetUnit, -powerToDistribute, true);

	const targets = allUnits
		.filter(u => u.id !== targetUnit.id)
		.filter(u => u.position[1] === targetUnit.position[1]
		);

	if (targets.length > 0) {
		const powerPerTarget = Math.floor(powerToDistribute / targets.length);
		targets.forEach((u: Unit) => {
			applyPowerDelta(u, powerPerTarget, true);
		});
	}

	return powerToDistribute;
}

/**
 * Apply sacrifice_effect_orb: Remove a random effect or reaction from the
 * target unit and grant a flat power increase.
 *
 * This mirrors the combat-time sacrificeEffect (TriggerSystem/effects/sacrificeEffect.ts),
 * adapted for the shop phase. Uses the seeded RNG for deterministic picks.
 */
function applySacrificeOrb(targetUnit: Unit, rng: { seed: string }): number {
  const hasEffects = targetUnit.effects && targetUnit.effects.length > 0;
  const hasReactions = targetUnit.reactions && targetUnit.reactions.length > 0;

  if (hasEffects || hasReactions) {
    // Randomly choose which type to remove when both exist
    let removeType: "effect" | "reaction";
    if (hasEffects && hasReactions) {
      const picked = Random.pickOneSeeded(rng, ["effect", "reaction"]);
      removeType = picked as "effect" | "reaction";
    } else {
      removeType = hasEffects ? "effect" : "reaction";
    }

    if (removeType === "effect") {
      const toRemove = Random.pickOneSeeded(rng, targetUnit.effects);
      targetUnit.effects = targetUnit.effects.filter((e) => e !== toRemove);
    } else {
      const toRemove = Random.pickOneSeeded(rng, targetUnit.reactions);
      targetUnit.reactions = targetUnit.reactions.filter((r) => r !== toRemove);
    }
  }

  const powerGain = OrbConstants.SACRIFICE_POWER_INCREASE;
  targetUnit.power += powerGain;
  return powerGain;
}

/**
 * Apply increase_power_on_X orb: Boost power of units with a specific effect.
 */
function applyIncreasePowerOrb(targetUnit: Unit, effectType: string): number {
	if (!targetUnit.effects?.some((e: { id: string }) => e.id === effectType)) {
		return 0;
	}

	const pct = Math.floor(targetUnit.power * ORB_POWER_INCREASE_FACTOR);
	targetUnit.power += pct;
	return pct;
}

/**
 * Apply increase_critical_on_X orb: Add critical strike chance to units with a specific effect.
 */
function applyIncreaseCriticalOrb(targetUnit: Unit, effectType: string): boolean {
	if (!targetUnit.effects?.some((e: { id: string }) => e.id === effectType)) {
		return false;
	}

	targetUnit.effects = targetUnit.effects || [];
	targetUnit.effects.push({
		id: "increase_critical",
		amount: 10,
		targets: { id: "self" },
	});
	return true;
}

/**
 * Apply decrease_cooldown_on_X orb: Reduce cooldown for units with a specific effect.
 */
function applyDecreaseCooldownOrb(targetUnit: Unit, effectType: string): number {
	if (!targetUnit.effects?.some((e: { id: string }) => e.id === effectType)) {
		return 0;
	}

	const reduction = targetUnit.cooldown * COOLDOWN_REDUCTION_FACTOR;
	targetUnit.cooldown = Math.max(ORB_MIN_COOLDOWN_MS, targetUnit.cooldown - reduction);
	return Math.floor(reduction);
}

/**
 * Apply an orb to a target unit.
 *
 * @param allUnits      All team units (needed for row-based orbs).
 * @param targetUnitId  The unit receiving the orb.
 * @param orbId         The orb identifier.
 * @param rng           Seeded RNG for deterministic random picks inside
 *                      reaction orbs. Only used for reaction-type orbs.
 * @returns The (possibly advanced) rng seed — callers MUST write this back.
 */
export function applyOrb(
  allUnits: Unit[],
  targetUnitId: string,
  orbId: string,
  rng: { seed: string }
): string {
  const targetUnit = allUnits.find((u: Unit) => u.id === targetUnitId);
  if (!targetUnit) {
    console.warn("orbAndCoreUpgrades", `Orb application failed: target unit with ID ${targetUnitId} not found`);
    return rng.seed;
  }

  if (orbId === "upgrade_orb") {
    applyUpgradeOrb(targetUnit);
  } else if (orbId === "absorb_power_orb") {
    const absorbed = applyAbsorbPowerOrb(targetUnit, allUnits);
    if (absorbed > 0) {
      console.info("orbAndCoreUpgrades", `Absorbed ${absorbed} power from row units`);
    }
  } else if (orbId === "distribute_power_orb") {
    const distributed = applyDistributePowerOrb(targetUnit, allUnits);
    if (distributed > 0) {
      console.info("orbAndCoreUpgrades", `Distributed ${distributed} power to row units`);
    }
  } else if (orbId === "sacrifice_effect_orb") {
    const powerGain = applySacrificeOrb(targetUnit, rng);
    console.info("orbAndCoreUpgrades", `Sacrifice effect applied, gained ${powerGain} power`);
  } else if (orbId.startsWith("increase_power_on_")) {
    const effectType = orbId.replace("increase_power_on_", "");
    const boost = applyIncreasePowerOrb(targetUnit, effectType);
    if (boost > 0) {
      console.info("orbAndCoreUpgrades", `Increased power by ${boost} (on ${effectType})`);
    }
  } else if (orbId.startsWith("increase_critical_on_")) {
    const effectType = orbId.replace("increase_critical_on_", "");
    if (applyIncreaseCriticalOrb(targetUnit, effectType)) {
      console.info("orbAndCoreUpgrades", `Increased critical (on ${effectType})`);
    }
  } else if (orbId.startsWith("decrease_cooldown_on_")) {
    const effectType = orbId.replace("decrease_cooldown_on_", "");
    const reduction = applyDecreaseCooldownOrb(targetUnit, effectType);
    if (reduction > 0) {
      console.info("orbAndCoreUpgrades", `Decreased cooldown by ${reduction}ms (on ${effectType})`);
    }
  } else {
    const def = ORB_DEFINITIONS[orbId];
    if (def && def.kind === "reaction") {
      const reaction = buildReaction(def, rng);
      targetUnit.reactions = targetUnit.reactions || [];
      targetUnit.reactions.push(reaction);
      console.info("orbAndCoreUpgrades", `Added reaction ${orbId} to unit ${targetUnit.id}`);
    }
  }

  return rng.seed;
}

/**
 * Upgrade core max life by (10% of current + 10 * round).
 */
export function upgradeCoreMaxLife(core: Unit, round: number): string {
	const lifeGain =
		Math.floor(core.maxLife * CORE_STAT_SCALING_FACTOR) + round * CORE_ROUND_SCALING;
	core.maxLife += lifeGain;
	core.life = core.maxLife; // Heal to full on upgrade
	return `Increased Core Max Life by ${lifeGain}`;
}

/**
 * Upgrade core power by (10% of current + 10 * round).
 */
export function upgradeCorePower(core: Unit, round: number): string {
	const powerGain =
		Math.floor(core.power * CORE_STAT_SCALING_FACTOR) + round * CORE_ROUND_SCALING;
	core.power += powerGain;
	core.bonusPower = (core.bonusPower || 0) + powerGain;
	return `Increased Core Power by ${powerGain}`;
}

/**
 * Reduce core cooldown by 10%.
 */
export function decreaseCoreCooldown(core: Unit): string {
	const reduction = core.cooldown * COOLDOWN_REDUCTION_FACTOR;
	core.cooldown = Math.max(ORB_MIN_COOLDOWN_MS, core.cooldown - reduction);
	return `Decreased Core Cooldown by ${Math.floor(reduction)}`;
}
