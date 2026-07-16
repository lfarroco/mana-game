/**
 * Orb and Core Upgrade Actions
 *
 * Handles special item effects (orbs) and core unit stat upgrades.
 * Pure functions that modify unit state based on orb type or core upgrade action.
 */

import * as Unit from "@Models/Entities/Unit";
import * as Logger from "@Utils/Logger";


const COOLDOWN_REDUCTION_FACTOR = 0.1;
const CORE_STAT_SCALING_FACTOR = 0.1;
const ORB_POWER_INCREASE_FACTOR = 0.1;
const MIN_COOLDOWN_MS = 1000;
const CORE_ROUND_SCALING = 10;

/**
 * Apply upgrade_orb: Rank up a unit (increase stats by 1.75x).
 * This aligns with the new bronze->silver->gold upgrade progression.
 */
function applyUpgradeOrb(unit: Unit.Unit): void {
	unit.rank = (unit.rank || 1) + 1;
	const rankMultiplier = 1.75;
	unit.maxLife = Math.floor(unit.maxLife * rankMultiplier);
	unit.life = unit.maxLife;
	unit.power = Math.floor(unit.power * rankMultiplier);
}

/**
 * Apply absorb_power_orb: Take 25% power from units in the same row.
 */
function applyAbsorbPowerOrb(targetUnit: Unit.Unit, allUnits: Unit.Unit[]): number {
	let totalAbsorbed = 0;
	allUnits.forEach((u: Unit.Unit) => {
		if (u.id !== targetUnit.id && u.position && u.position[1] === targetUnit.position[1]) {
			const absorbed = Math.floor(u.power * 0.25);
			if (absorbed > 0) {
				Unit.applyPowerDelta(u, -absorbed, true);
				totalAbsorbed += absorbed;
			}
		}
	});

	if (totalAbsorbed > 0) {
		Unit.applyPowerDelta(targetUnit, totalAbsorbed, true);
	}

	return totalAbsorbed;
}

/**
 * Apply distribute_power_orb: Give 50% of unit's power to units in the same row.
 */
function applyDistributePowerOrb(targetUnit: Unit.Unit, allUnits: Unit.Unit[]): number {
	const powerToDistribute = Math.floor(targetUnit.power * 0.5);
	if (powerToDistribute <= 0) return 0;

	Unit.applyPowerDelta(targetUnit, -powerToDistribute, true);

	const targets = allUnits
		.filter(u => u.id !== targetUnit.id)
		.filter(u => u.position[1] === targetUnit.position[1]
		);

	if (targets.length > 0) {
		const powerPerTarget = Math.floor(powerToDistribute / targets.length);
		targets.forEach((u: Unit.Unit) => {
			Unit.applyPowerDelta(u, powerPerTarget, true);
		});
	}

	return powerToDistribute;
}

/**
 * Apply increase_power_on_X orb: Boost power of units with a specific effect.
 */
function applyIncreasePowerOrb(targetUnit: Unit.Unit, effectType: string): number {
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
function applyIncreaseCriticalOrb(targetUnit: Unit.Unit, effectType: string): boolean {
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
function applyDecreaseCooldownOrb(targetUnit: Unit.Unit, effectType: string): number {
	if (!targetUnit.effects?.some((e: { id: string }) => e.id === effectType)) {
		return 0;
	}

	const reduction = targetUnit.cooldown * COOLDOWN_REDUCTION_FACTOR;
	targetUnit.cooldown = Math.max(MIN_COOLDOWN_MS, targetUnit.cooldown - reduction);
	return Math.floor(reduction);
}

/**
 * Apply an orb to a target unit.
 * Returns the list of update messages describing what happened.
 */
export function applyOrb(
	allUnits: Unit.Unit[],
	targetUnitId: string,
	orbId: string
) {
	const targetUnit = allUnits.find((u: Unit.Unit) => u.id === targetUnitId);
	if (!targetUnit) {
		Logger.warn("orbAndCoreUpgrades", `Orb application failed: target unit with ID ${targetUnitId} not found`);
		return;
	}

	if (orbId === "upgrade_orb") {
		applyUpgradeOrb(targetUnit);
	} else if (orbId === "absorb_power_orb") {
		const absorbed = applyAbsorbPowerOrb(targetUnit, allUnits);
		if (absorbed > 0) {
			Logger.info("orbAndCoreUpgrades", `Absorbed ${absorbed} power from row units`);
		}
	} else if (orbId === "distribute_power_orb") {
		const distributed = applyDistributePowerOrb(targetUnit, allUnits);
		if (distributed > 0) {
			Logger.info("orbAndCoreUpgrades", `Distributed ${distributed} power to row units`);
		}
	} else if (orbId.startsWith("increase_power_on_")) {
		const effectType = orbId.replace("increase_power_on_", "");
		const boost = applyIncreasePowerOrb(targetUnit, effectType);
		if (boost > 0) {
			Logger.info("orbAndCoreUpgrades", `Increased power by ${boost} (on ${effectType})`);
		}
	} else if (orbId.startsWith("increase_critical_on_")) {
		const effectType = orbId.replace("increase_critical_on_", "");
		if (applyIncreaseCriticalOrb(targetUnit, effectType)) {
			Logger.info("orbAndCoreUpgrades", `Increased critical (on ${effectType})`);
		}
	} else if (orbId.startsWith("decrease_cooldown_on_")) {
		const effectType = orbId.replace("decrease_cooldown_on_", "");
		const reduction = applyDecreaseCooldownOrb(targetUnit, effectType);
		if (reduction > 0) {
			Logger.info("orbAndCoreUpgrades", `Decreased cooldown by ${reduction}ms (on ${effectType})`);
		}
	}

}

/**
 * Upgrade core max life by (10% of current + 10 * round).
 */
export function upgradeCoreMaxLife(core: Unit.Unit, round: number): string {
	const lifeGain =
		Math.floor(core.maxLife * CORE_STAT_SCALING_FACTOR) + round * CORE_ROUND_SCALING;
	core.maxLife += lifeGain;
	core.life = core.maxLife; // Heal to full on upgrade
	return `Increased Core Max Life by ${lifeGain}`;
}

/**
 * Upgrade core power by (10% of current + 10 * round).
 */
export function upgradeCorepower(core: Unit.Unit, round: number): string {
	const powerGain =
		Math.floor(core.power * CORE_STAT_SCALING_FACTOR) + round * CORE_ROUND_SCALING;
	core.power += powerGain;
	core.bonusPower = (core.bonusPower || 0) + powerGain;
	return `Increased Core Power by ${powerGain}`;
}

/**
 * Reduce core cooldown by 10%.
 */
export function decreaseCoresCooldown(core: Unit.Unit): string {
	const reduction = core.cooldown * COOLDOWN_REDUCTION_FACTOR;
	core.cooldown = Math.max(MIN_COOLDOWN_MS, core.cooldown - reduction);
	return `Decreased Core Cooldown by ${Math.floor(reduction)}`;
}
